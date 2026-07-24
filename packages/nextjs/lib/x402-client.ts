/**
 * x402 Client — Browser-side
 *
 * Implements the client-side x402 payment flow using the Hedera SDK.
 * Builds and signs a TransferTransaction, then retries requests with
 * the payment-signature header.
 *
 * Uses a pre-funded "demo wallet" (testnet keys from env vars).
 * In production, replace with HashPack/Blade wallet signing.
 */

import {
  Client,
  TransferTransaction,
  Hbar,
  HbarUnit,
  PrivateKey,
  AccountId,
  Transaction,
  TransactionId,
  Timestamp,
} from '@hashgraph/sdk';

export interface PaymentChallenge {
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
  extra: {
    feePayer: string;
    mirrorNode: string;
  };
}

export interface DemoWallet {
  accountId: string;
  privateKey: string;
}

export interface PaymentSignaturePayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    transactionBytes: string; // base64
    signerAccountId: string;
  };
}

export interface FetchResult {
  ok: boolean;
  status: number;
  data?: unknown;
  paymentResponse?: PaymentChallenge;
  transactionId?: string;
  error?: string;
}

/**
 * Build and sign a Hedera TransferTransaction for the given x402 challenge.
 * Returns the base64-encoded payment-signature header value.
 */
export async function createPaymentSignature(
  challenge: PaymentChallenge,
  wallet: DemoWallet
): Promise<string> {
  if (challenge.scheme !== 'exact') {
    throw new Error(`Unsupported scheme: ${challenge.scheme}`);
  }
  if (!challenge.network.startsWith('hedera:')) {
    throw new Error(`Unsupported network: ${challenge.network}`);
  }

  const client = Client.forTestnet();
  let operatorId: AccountId;
  let operatorKey: PrivateKey;
  try {
    operatorId = AccountId.fromString(wallet.accountId);
    operatorKey = PrivateKey.fromStringECDSA(wallet.privateKey);
  } catch (err: any) {
    throw new Error(`Invalid demo wallet credentials: ${err.message}`);
  }
  client.setOperator(operatorId, operatorKey);

  const amountTinybars = parseInt(challenge.maxAmountRequired, 10);
  
  let feePayer: AccountId;
  try {
    if (!challenge.extra?.feePayer) throw new Error("empty feePayer");
    feePayer = AccountId.fromString(challenge.extra.feePayer);
  } catch (err: any) {
    throw new Error(`Invalid feePayer in challenge. Is the facilitator running? (${err.message})`);
  }

  let payTo: AccountId;
  try {
    if (!challenge.payTo) throw new Error("empty payTo");
    payTo = AccountId.fromString(challenge.payTo);
  } catch (err: any) {
    throw new Error(`Invalid payTo in challenge. Is PAY_TO_ACCOUNT set in server .env? (${err.message})`);
  }

  // Generate a TransactionId for the feePayer so they are charged the transaction fee.
  // Subtract 15 seconds to prevent INVALID_TRANSACTION_START if local clock is slightly ahead of Hedera consensus nodes.
  const validStart = Timestamp.fromDate(new Date(Date.now() - 15000));
  const txId = TransactionId.withValidStart(feePayer, validStart);

  // Build transfer: buyer pays seller, facilitator pays network fee
  const tx = new TransferTransaction()
    .setTransactionId(txId)
    .addHbarTransfer(operatorId, Hbar.fromTinybars(-amountTinybars))
    .addHbarTransfer(payTo, Hbar.fromTinybars(amountTinybars))
    .setTransactionMemo(`x402:${challenge.resource}`)
    .setTransactionValidDuration(challenge.maxTimeoutSeconds);

  // Freeze with the client (sets node + valid start)
  const frozenTx = tx.freezeWith(client);

  // Buyer signs (authorizes HBAR debit from their account)
  const signedTx = await frozenTx.sign(operatorKey);

  // Serialize to bytes
  const txBytes = signedTx.toBytes();
  const txBytesBase64 = Buffer.from(txBytes).toString('base64');

  const payload: PaymentSignaturePayload = {
    x402Version: 1,
    scheme: 'exact',
    network: challenge.network,
    payload: {
      transactionBytes: txBytesBase64,
      signerAccountId: wallet.accountId,
    },
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Parse the payment-required header from a 402 response.
 */
export function parsePaymentRequired(header: string): PaymentChallenge {
  const decoded = Buffer.from(header, 'base64').toString('utf-8');
  return JSON.parse(decoded) as PaymentChallenge;
}

/**
 * Parse the payment-response header from a 200 response.
 */
export function parsePaymentResponse(header: string): unknown {
  const decoded = Buffer.from(header, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

/**
 * Fetch a protected x402 resource.
 *
 * 1. Makes initial request
 * 2. If 402: parses challenge, signs payment, retries
 * 3. Returns response data + payment receipt
 */
export async function fetch402(
  url: string,
  wallet: DemoWallet,
  options?: RequestInit
): Promise<FetchResult> {
  // Step 1: Initial unauthenticated request
  const firstResponse = await fetch(url, {
    ...options,
    headers: { ...(options?.headers ?? {}), accept: 'application/json' },
  });

  if (firstResponse.status !== 402) {
    // Not protected, or already paid
    const data = await firstResponse.json().catch(() => null);
    return { ok: firstResponse.ok, status: firstResponse.status, data };
  }

  // Step 2: Parse the 402 challenge
  const paymentRequired = firstResponse.headers.get('payment-required');
  if (!paymentRequired) {
    return {
      ok: false,
      status: 402,
      error: 'Server returned 402 but no payment-required header',
    };
  }

  const challenge = parsePaymentRequired(paymentRequired);

  // Step 3: Create and sign the payment
  const paymentSignature = await createPaymentSignature(challenge, wallet);

  // Step 4: Retry with payment
  const paidResponse = await fetch(url, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      accept: 'application/json',
      'payment-signature': paymentSignature,
    },
  });

  if (!paidResponse.ok) {
    const errData = await paidResponse.json().catch(() => ({ error: 'Unknown error' }));
    return {
      ok: false,
      status: paidResponse.status,
      error: (errData as { error?: string }).error ?? 'Payment failed',
    };
  }

  // Step 5: Parse response + receipt
  const data = await paidResponse.json();
  const paymentResponseHeader = paidResponse.headers.get('payment-response');
  const txId = paidResponse.headers.get('x-transaction-id') ?? undefined;

  return {
    ok: true,
    status: 200,
    data,
    paymentResponse: paymentResponseHeader
      ? (parsePaymentResponse(paymentResponseHeader) as PaymentChallenge)
      : undefined,
    transactionId: txId,
  };
}

/**
 * Get HashScan URL for a Hedera transaction ID
 */
export function getHashScanUrl(txId: string): string {
  return `https://hashscan.io/testnet/transaction/${txId}`;
}
