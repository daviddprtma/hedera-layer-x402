/**
 * GET /api/catalog
 * Free endpoint — returns all available paid resources with pricing.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CATALOG = [
  {
    id: 'spot-price',
    endpoint: '/api/data/spot-price',
    name: 'Spot Price',
    description: 'Real-time asset spot price for any symbol',
    amountTinybars: 1_000_000,
    amountHbar: '0.01',
    category: 'market-data',
    params: [{ name: 'symbol', type: 'string', example: 'HBAR', required: true }],
  },
  {
    id: 'market-summary',
    endpoint: '/api/data/market',
    name: 'Market Summary',
    description: 'Full market overview with top movers and volume leaders',
    amountTinybars: 5_000_000,
    amountHbar: '0.05',
    category: 'market-data',
    params: [],
  },
  {
    id: 'ohlc',
    endpoint: '/api/data/ohlc',
    name: 'OHLC Candlesticks',
    description: 'Historical OHLC candlestick data for any trading pair',
    amountTinybars: 3_000_000,
    amountHbar: '0.03',
    category: 'market-data',
    params: [
      { name: 'symbol', type: 'string', example: 'HBAR', required: true },
      { name: 'interval', type: 'string', example: '1h', required: false },
    ],
  },
  {
    id: 'ai-summarize',
    endpoint: '/api/ai/summarize',
    name: 'AI Summarize',
    description: 'AI-generated analysis and summary of any financial topic',
    amountTinybars: 10_000_000,
    amountHbar: '0.10',
    category: 'ai',
    params: [{ name: 'topic', type: 'string', example: 'Hedera DeFi growth', required: true }],
  },
];

export async function GET() {
  return NextResponse.json(
    {
      version: '1.0',
      network: process.env.HEDERA_NETWORK ?? 'hedera:testnet',
      payTo: process.env.PAY_TO_ACCOUNT ?? '',
      facilitatorUrl: process.env.FACILITATOR_URL ?? 'http://localhost:4020',
      resources: CATALOG,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    }
  );
}
