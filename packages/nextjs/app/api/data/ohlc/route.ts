/**
 * GET /api/data/ohlc?symbol=HBAR&interval=1h
 * Protected: 3,000,000 tinybars (0.03 HBAR)
 *
 * Returns mock OHLC candlestick data.
 */

import { NextResponse } from 'next/server';
import { requirePayment } from '@/lib/x402-middleware';

export const dynamic = 'force-dynamic';

function generateOHLC(symbol: string, interval: string, count = 24) {
  const basePrices: Record<string, number> = {
    HBAR: 0.0512, BTC: 67840, ETH: 3521, SOL: 156, USDC: 1.0,
  };
  const base = basePrices[symbol.toUpperCase()] ?? 50;
  const volatility = base * 0.02;

  const candles = [];
  let price = base;
  const now = Date.now();
  const intervalMs: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 };
  const ms = intervalMs[interval] ?? 3_600_000;

  for (let i = count; i >= 0; i--) {
    const open = price;
    const move = (Math.random() - 0.48) * volatility;
    const close = Math.max(open + move, open * 0.95);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    const volume = base * 1000 * (0.5 + Math.random());

    candles.push({
      timestamp: new Date(now - i * ms).toISOString(),
      open: parseFloat(open.toFixed(8)),
      high: parseFloat(high.toFixed(8)),
      low: parseFloat(low.toFixed(8)),
      close: parseFloat(close.toFixed(8)),
      volume: parseFloat(volume.toFixed(2)),
    });
    price = close;
  }

  return {
    symbol: symbol.toUpperCase(),
    interval,
    candles,
    count: candles.length,
    timestamp: new Date().toISOString(),
    source: 'layer402-mock-feed',
  };
}

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') ?? 'HBAR';
  const interval = url.searchParams.get('interval') ?? '1h';

  return NextResponse.json(generateOHLC(symbol, interval), {
    headers: { 'Cache-Control': 'no-store' },
  });
};

export const GET = requirePayment(
  {
    amountTinybars: 3_000_000,
    description: 'Pay 0.03 HBAR to access OHLC candlestick data',
    mimeType: 'application/json',
  },
  handler
);

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
