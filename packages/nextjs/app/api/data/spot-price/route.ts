/**
 * GET /api/data/spot-price?symbol=HBAR
 * Protected: 1,000,000 tinybars (0.01 HBAR)
 *
 * Returns mock spot price data.
 * In production, replace with real price feed.
 */

import { NextResponse } from 'next/server';
import { requirePayment } from '@/lib/x402-middleware';

export const dynamic = 'force-dynamic';

// Mock price data generator
function getMockPrice(symbol: string) {
  const prices: Record<string, { price: number; change24h: number; volume24h: number }> = {
    HBAR: { price: 0.0512, change24h: 3.21, volume24h: 28_450_000 },
    BTC: { price: 67_840.50, change24h: -1.12, volume24h: 12_300_000_000 },
    ETH: { price: 3_521.00, change24h: 0.87, volume24h: 6_800_000_000 },
    SOL: { price: 156.40, change24h: 5.44, volume24h: 1_200_000_000 },
    USDC: { price: 1.00, change24h: 0.01, volume24h: 40_000_000_000 },
  };

  const sym = symbol.toUpperCase();
  const base = prices[sym] ?? { price: Math.random() * 100, change24h: (Math.random() - 0.5) * 10, volume24h: Math.random() * 1e9 };

  // Add small noise to price
  const noise = 1 + (Math.random() - 0.5) * 0.002;
  return {
    symbol: sym,
    price: parseFloat((base.price * noise).toFixed(6)),
    change24h: parseFloat(base.change24h.toFixed(2)),
    changePercent24h: parseFloat(((base.change24h / base.price) * 100).toFixed(2)),
    volume24h: base.volume24h,
    timestamp: new Date().toISOString(),
    source: 'layer402-mock-feed',
  };
}

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') ?? 'HBAR';
  const data = getMockPrice(symbol);

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
};

export const GET = requirePayment(
  {
    amountTinybars: 1_000_000,
    description: 'Pay 0.01 HBAR to access spot price data',
    mimeType: 'application/json',
  },
  handler
);

// Handle preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, payment-signature',
      'Access-Control-Expose-Headers': 'payment-required, payment-response, x-transaction-id',
    },
  });
}
