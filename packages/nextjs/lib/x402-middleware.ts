/**
 * x402 Hedera Middleware — Server-side
 *
 * Wraps a Next.js route handler to require payment.
 * - If no `payment-signature` header: returns 402 + payment-required challenge
 * - If header present: calls facilitator to settle, then runs handler
 */

const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'http://localhost:4020';
const PAY_TO_ACCOUNT = process.env.PAY_TO_ACCOUNT ?? '';
const HEDERA_NETWORK = process.env.HEDERA_NETWORK ?? 'hedera:testnet';
const MIRROR_NODE_URL =
  process.env.HEDERA_MIRROR_NODE_URL ?? 'https://testnet.mirrornode.hedera.com';

export interface PaymentConfig {
  /** Amount in tinybars (1 HBAR = 100,000,000 tinybars) */
  amountTinybars: number;
  /** Human-readable resource description */
  description: string;
  /** MIME type of the response */
  mimeType?: string;
}

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

export interface SettlementResult {
  success: boolean;
  transaction?: string;
  paymentResponse?: string;
  error?: string;
}

/** Fetch the facilitator's fee-payer account ID */
let cachedFeePayer: string | null = null;
async function getFacilitatorFeePayer(): Promise<string> {
  if (cachedFeePayer) return cachedFeePayer;
  try {
    const res = await fetch(`${FACILITATOR_URL}/supported`);
    const data = (await res.json()) as { extra?: { feePayer?: string } };
    cachedFeePayer = data.extra?.feePayer ?? '';
    return cachedFeePayer;
  } catch {
    return '';
  }
}

/** Build a payment challenge for a given resource */
export async function buildPaymentChallenge(
  resource: string,
  config: PaymentConfig
): Promise<PaymentChallenge> {
  const feePayer = await getFacilitatorFeePayer();
  return {
    x402Version: 1,
    scheme: 'exact',
    network: HEDERA_NETWORK,
    maxAmountRequired: config.amountTinybars.toString(),
    resource,
    description: config.description,
    mimeType: config.mimeType ?? 'application/json',
    payTo: PAY_TO_ACCOUNT,
    maxTimeoutSeconds: 120,
    asset: 'HBAR',
    extra: {
      feePayer,
      mirrorNode: MIRROR_NODE_URL,
    },
  };
}

/** Encode challenge as base64 for the payment-required header */
export function encodeChallenge(challenge: PaymentChallenge): string {
  return Buffer.from(JSON.stringify(challenge)).toString('base64');
}

/** Decode a payment-signature header value */
export function decodePaymentSignature(header: string): unknown {
  return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
}

/** Call facilitator to settle a payment */
export async function settlePayment(
  paymentHeader: string,
  challenge: PaymentChallenge
): Promise<SettlementResult> {
  try {
    const res = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentHeader, challenge }),
    });
    const data = (await res.json()) as SettlementResult;
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Facilitator error: ${message}` };
  }
}

/**
 * Higher-order function: wraps a Next.js route handler with x402 payment.
 *
 * Usage:
 * ```ts
 * export const GET = requirePayment(
 *   { amountTinybars: 1_000_000, description: 'Pay for data' },
 *   async (req) => NextResponse.json({ data: 'secret' })
 * );
 * ```
 */
export function requirePayment(
  config: PaymentConfig,
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const resource = url.pathname;

    if (!PAY_TO_ACCOUNT) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: PAY_TO_ACCOUNT is missing in environment variables.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const challenge = await buildPaymentChallenge(resource, config);
    if (!challenge.extra?.feePayer) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Facilitator is not running or did not provide a feePayer.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paymentSig = req.headers.get('payment-signature');

    // No payment provided — issue 402 challenge
    if (!paymentSig) {
      const encoded = encodeChallenge(challenge);
      return new Response(
        JSON.stringify({
          error: 'Payment Required',
          message: config.description,
          x402Version: 1,
        }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'payment-required': encoded,
            'Access-Control-Expose-Headers': 'payment-required',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Payment provided — ask facilitator to settle
    const settlement = await settlePayment(paymentSig, challenge);

    if (!settlement.success) {
      return new Response(
        JSON.stringify({ error: 'Payment failed', details: settlement.error }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Payment settled — run handler and attach receipt
    const response = await handler(req);
    const newHeaders = new Headers(response.headers);
    if (settlement.paymentResponse) {
      newHeaders.set('payment-response', settlement.paymentResponse);
      newHeaders.set(
        'Access-Control-Expose-Headers',
        'payment-response, x-transaction-id'
      );
    }
    if (settlement.transaction) {
      newHeaders.set('x-transaction-id', settlement.transaction);
    }
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  };
}
