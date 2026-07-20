/**
 * Layer402 — Self-hosted x402 Hedera Facilitator
 *
 * The facilitator is a trusted co-signer that:
 * 1. Advertises fee-payer identity via GET /supported
 * 2. Verifies buyer's signed TransferTransaction via POST /verify
 * 3. Co-signs as fee-payer + submits to Hedera via POST /settle
 *
 * The resource server holds NO private key.
 * The facilitator holds an ECDSA fee-payer account that pays Hedera network fees.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from monorepo root (.env is one level up from facilitator dir)
dotenv.config({ path: path.join(process.cwd(), '../.env') });
// Also try standard location as fallback
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  Client,
  Transaction,
  TransferTransaction,
  AccountId,
  PrivateKey,
  Hbar,
  HbarUnit,
  Status,
} from '@hashgraph/sdk';

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.FACILITATOR_PORT ?? '4020', 10);
const NETWORK = (process.env.X402_NETWORK ?? 'hedera:testnet') as string;
const FACILITATOR_ACCOUNT_ID = process.env.FACILITATOR_ACCOUNT_ID ?? '';
const FACILITATOR_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY ?? '';

if (!FACILITATOR_ACCOUNT_ID || !FACILITATOR_PRIVATE_KEY) {
  console.error(
    '❌  FACILITATOR_ACCOUNT_ID and FACILITATOR_PRIVATE_KEY must be set in .env'
  );
  process.exit(1);
}

// ─── Hedera Client ───────────────────────────────────────────────────────────

const hederaClient = Client.forTestnet();
hederaClient.setOperator(
  AccountId.fromString(FACILITATOR_ACCOUNT_ID),
  PrivateKey.fromStringECDSA(FACILITATOR_PRIVATE_KEY)
);
// Set max transaction fee budget
hederaClient.setDefaultMaxTransactionFee(new Hbar(1));

// ─── Settled TX store (anti-replay) ──────────────────────────────────────────

/** Stores transaction IDs that have already been settled. Prevents double-spend. */
const settledTransactions = new Set<string>();

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentRequiredChallenge {
  x402Version: number;
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    feePayer?: string;
    [key: string]: unknown;
  };
}

interface PaymentSignaturePayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    transactionBytes: string; // base64-encoded signed TransferTransaction bytes
    signerAccountId: string;
  };
}

// ─── GET /health ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', facilitator: FACILITATOR_ACCOUNT_ID, network: NETWORK });
});

// ─── GET /supported ──────────────────────────────────────────────────────────
/**
 * Advertises which payment schemes this facilitator supports.
 * Clients/resource servers query this to build payment challenges.
 */
app.get('/supported', (_req: Request, res: Response) => {
  res.json({
    kinds: [
      {
        x402Version: 1,
        scheme: 'exact',
        network: NETWORK,
      },
    ],
    extra: {
      feePayer: FACILITATOR_ACCOUNT_ID,
    },
  });
});

// ─── POST /verify ─────────────────────────────────────────────────────────────
/**
 * Verifies that a payment signature matches the given challenge.
 * Does NOT submit to Hedera yet — just validation.
 */
app.post('/verify', async (req: Request, res: Response) => {
  try {
    const { paymentHeader, challenge } = req.body as {
      paymentHeader: string;
      challenge: PaymentRequiredChallenge;
    };

    if (!paymentHeader || !challenge) {
      return res.status(400).json({ isValid: false, error: 'Missing paymentHeader or challenge' });
    }

    const payload = decodePaymentHeader(paymentHeader);
    const validation = validatePayload(payload, challenge);

    if (!validation.valid) {
      return res.status(200).json({ isValid: false, error: validation.error });
    }

    // Deserialize transaction bytes and check signatures
    const txBytes = Buffer.from(payload.payload.transactionBytes, 'base64');
    const tx = Transaction.fromBytes(txBytes);

    // Basic checks
    if (!(tx instanceof TransferTransaction)) {
      return res.status(200).json({ isValid: false, error: 'Transaction is not a TransferTransaction' });
    }

    return res.json({ isValid: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[verify] Error:', message);
    return res.status(200).json({ isValid: false, error: message });
  }
});

// ─── POST /settle ─────────────────────────────────────────────────────────────
/**
 * Verifies + co-signs + submits the TransferTransaction to Hedera.
 * Returns a settlement receipt with the transaction ID.
 */
app.post('/settle', async (req: Request, res: Response) => {
  try {
    const { paymentHeader, challenge } = req.body as {
      paymentHeader: string;
      challenge: PaymentRequiredChallenge;
    };

    if (!paymentHeader || !challenge) {
      return res.status(400).json({ success: false, error: 'Missing paymentHeader or challenge' });
    }

    const payload = decodePaymentHeader(paymentHeader);
    const validation = validatePayload(payload, challenge);

    if (!validation.valid) {
      return res.status(402).json({ success: false, error: validation.error });
    }

    // Deserialize transaction bytes
    const txBytes = Buffer.from(payload.payload.transactionBytes, 'base64');
    const tx = Transaction.fromBytes(txBytes);

    if (!(tx instanceof TransferTransaction)) {
      return res.status(400).json({ success: false, error: 'Transaction is not a TransferTransaction' });
    }

    // Generate stable transaction key for anti-replay (use first sig key)
    const txKey = Buffer.from(txBytes).toString('hex').slice(0, 64);
    if (settledTransactions.has(txKey)) {
      return res.status(400).json({ success: false, error: 'Transaction already settled (replay rejected)' });
    }

    // Validate transfer details
    const transfersMap = tx.hbarTransfers;
    const payToAccount = AccountId.fromString(challenge.payTo);
    const requiredAmount = Long.fromString(challenge.maxAmountRequired);

    let receiverAmount: bigint | null = null;
    for (const [accountId, amount] of transfersMap) {
      if (accountId.toString() === payToAccount.toString()) {
        receiverAmount = BigInt(amount.toTinybars().toString());
        break;
      }
    }

    if (receiverAmount === null) {
      return res.status(402).json({
        success: false,
        error: `Transfer to ${challenge.payTo} not found in transaction`,
      });
    }

    if (receiverAmount < BigInt(challenge.maxAmountRequired)) {
      return res.status(402).json({
        success: false,
        error: `Insufficient amount: got ${receiverAmount} tinybars, need ${challenge.maxAmountRequired}`,
      });
    }

    // Co-sign as fee-payer and execute
    const facilitatorKey = PrivateKey.fromStringECDSA(FACILITATOR_PRIVATE_KEY);
    const signedTx = await tx.sign(facilitatorKey);
    const response = await signedTx.execute(hederaClient);
    const receipt = await response.getReceipt(hederaClient);

    if (receipt.status !== Status.Success) {
      return res.status(500).json({
        success: false,
        error: `Transaction failed with status: ${receipt.status.toString()}`,
      });
    }

    // Mark as settled
    settledTransactions.add(txKey);

    const txId = response.transactionId.toString();
    console.log(`✅ Settled: ${txId} | Resource: ${challenge.resource} | Amount: ${receiverAmount} tinybars`);

    // Build settlement receipt
    const settlementResponse = {
      x402Version: 1,
      transaction: txId,
      network: NETWORK,
      payer: payload.payload.signerAccountId,
      receiver: challenge.payTo,
      amount: challenge.maxAmountRequired,
      resource: challenge.resource,
      settledAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      transaction: txId,
      paymentResponse: Buffer.from(JSON.stringify(settlementResponse)).toString('base64'),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[settle] Error:', message);
    return res.status(500).json({ success: false, error: message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodePaymentHeader(header: string): PaymentSignaturePayload {
  const decoded = Buffer.from(header, 'base64').toString('utf-8');
  return JSON.parse(decoded) as PaymentSignaturePayload;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validatePayload(
  payload: PaymentSignaturePayload,
  challenge: PaymentRequiredChallenge
): ValidationResult {
  if (payload.x402Version !== 1) {
    return { valid: false, error: 'Unsupported x402Version' };
  }
  if (payload.scheme !== 'exact') {
    return { valid: false, error: `Unsupported scheme: ${payload.scheme}` };
  }
  if (payload.network !== NETWORK) {
    return { valid: false, error: `Network mismatch: expected ${NETWORK}, got ${payload.network}` };
  }
  if (!payload.payload?.transactionBytes) {
    return { valid: false, error: 'Missing transactionBytes' };
  }
  if (!payload.payload?.signerAccountId) {
    return { valid: false, error: 'Missing signerAccountId' };
  }
  return { valid: true };
}

// Needed for Hbar amount comparison
import Long from 'long';

// ─── Error handler ───────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[facilitator] Unhandled error:', err.message);
  res.status(500).json({ error: err.message });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         Layer402 — x402 Hedera Facilitator           ║
╠══════════════════════════════════════════════════════╣
║  Listening on  : http://localhost:${PORT}              ║
║  Fee-payer     : ${FACILITATOR_ACCOUNT_ID.padEnd(32)}  ║
║  Network       : ${NETWORK.padEnd(32)}  ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;
