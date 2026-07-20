/**
 * GET /api/data/market
 * Protected: 5,000,000 tinybars (0.05 HBAR)
 *
 * Returns mock market summary data.
 */

import { NextResponse } from 'next/server';
import { requirePayment } from '@/lib/x402-middleware';

export const dynamic = 'force-dynamic';

function getMockMarket() {
  return {
    overview: {
      totalMarketCap: 2_380_000_000_000,
      totalVolume24h: 98_400_000_000,
      btcDominance: 52.4,
      fearGreedIndex: 71,
      fearGreedLabel: 'Greed',
    },
    topGainers: [
      { symbol: 'HBAR', name: 'Hedera', change24h: 8.2, price: 0.0567 },
      { symbol: 'SOL', name: 'Solana', change24h: 5.4, price: 164.20 },
      { symbol: 'AVAX', name: 'Avalanche', change24h: 4.1, price: 38.90 },
    ],
    topLosers: [
      { symbol: 'DOGE', name: 'Dogecoin', change24h: -3.1, price: 0.158 },
      { symbol: 'LTC', name: 'Litecoin', change24h: -2.4, price: 82.40 },
    ],
    volumeLeaders: [
      { symbol: 'USDT', name: 'Tether', volume24h: 52_000_000_000 },
      { symbol: 'BTC', name: 'Bitcoin', volume24h: 12_300_000_000 },
      { symbol: 'USDC', name: 'USD Coin', volume24h: 9_800_000_000 },
    ],
    hederaEcosystem: {
      hbarPrice: 0.0512 + (Math.random() - 0.5) * 0.002,
      totalTransactions: 8_200_000_000,
      activeAccounts: 7_400_000,
      networkFeePaid24h: 0.0001,
    },
    timestamp: new Date().toISOString(),
    source: 'layer402-mock-feed',
  };
}

const handler = async (_req: Request) => {
  return NextResponse.json(getMockMarket(), {
    headers: { 'Cache-Control': 'no-store' },
  });
};

export const GET = requirePayment(
  {
    amountTinybars: 5_000_000,
    description: 'Pay 0.05 HBAR to access full market summary',
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
