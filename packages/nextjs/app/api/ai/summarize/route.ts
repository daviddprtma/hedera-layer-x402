/**
 * GET /api/ai/summarize?topic=Hedera+DeFi
 * Protected: 10,000,000 tinybars (0.10 HBAR)
 *
 * Returns mock AI-generated analysis.
 */

import { NextResponse } from 'next/server';
import { requirePayment } from '@/lib/x402-middleware';

export const dynamic = 'force-dynamic';

function getMockAISummary(topic: string) {
  const summaries: Record<string, { summary: string; sentiment: string; keyPoints: string[] }> = {
    'Hedera DeFi': {
      summary: `Hedera's DeFi ecosystem continues to demonstrate resilience with TVL increasing 23% quarter-over-quarter. The network's low, predictable transaction fees ($0.0001 for HBAR transfers) make it uniquely positioned for high-frequency DeFi protocols. SaucerSwap remains the dominant DEX with $180M TVL, while new lending protocols are gaining traction on the Hedera EVM layer.`,
      sentiment: 'Bullish',
      keyPoints: [
        'TVL grew 23% QoQ to $240M total',
        'HBAR transfer fee stability at $0.0001 enabling micro-yield strategies',
        'SaucerSwap processing 450k daily swaps',
        'HTS token standard powering 8 new DeFi primitives',
        'Institutional adoption accelerating via Hashport bridge',
      ],
    },
    default: {
      summary: `Analysis of "${topic}": The market shows mixed signals with technical indicators pointing to consolidation before the next directional move. On-chain metrics suggest accumulation at current levels, while macro headwinds from regulatory developments create uncertainty. Layer-2 adoption continues to outpace expectations, particularly in payment infrastructure.`,
      sentiment: 'Neutral',
      keyPoints: [
        'Technical consolidation phase detected',
        'On-chain accumulation signals present',
        'Regulatory clarity expected Q2 2025',
        'L2 payment volumes up 340% YoY',
        'Institutional interest remains elevated',
      ],
    },
  };

  const key = Object.keys(summaries).find(k => topic.toLowerCase().includes(k.toLowerCase())) ?? 'default';
  const result = summaries[key === 'default' ? 'default' : key];

  return {
    topic,
    ...result,
    confidence: parseFloat((0.75 + Math.random() * 0.2).toFixed(2)),
    wordCount: result.summary.split(' ').length,
    generatedAt: new Date().toISOString(),
    model: 'layer402-analysis-v1',
    source: 'layer402-ai-mock',
  };
}

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const topic = url.searchParams.get('topic') ?? 'Hedera DeFi';

  return NextResponse.json(getMockAISummary(topic), {
    headers: { 'Cache-Control': 'no-store' },
  });
};

export const GET = requirePayment(
  {
    amountTinybars: 10_000_000,
    description: 'Pay 0.10 HBAR for AI-generated financial analysis',
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
