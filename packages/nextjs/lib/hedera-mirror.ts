/**
 * Hedera Mirror Node REST API client
 * No SDK required — pure HTTP queries against testnet mirror node.
 */

const MIRROR_NODE_BASE = 'https://testnet.mirrornode.hedera.com/api/v1';

export interface AccountBalance {
  account: string;
  balance: number;
  balanceHbar: number;
  timestamp: string;
}

export interface Transaction {
  transactionId: string;
  result: string;
  consensusTimestamp: string;
  transfers: Array<{
    account: string;
    amount: number;
  }>;
  memo?: string;
}

export interface TransactionList {
  transactions: Transaction[];
  links?: { next?: string };
}

/** Get HBAR balance for an account (in tinybars and HBAR) */
export async function getAccountBalance(accountId: string): Promise<AccountBalance | null> {
  try {
    const res = await fetch(`${MIRROR_NODE_BASE}/accounts/${accountId}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      account: string;
      balance: { balance: number; timestamp: string };
    };

    return {
      account: data.account,
      balance: data.balance.balance,
      balanceHbar: data.balance.balance / 1e8,
      timestamp: data.balance.timestamp,
    };
  } catch {
    return null;
  }
}

/** Get recent transactions for an account */
export async function getAccountTransactions(
  accountId: string,
  limit = 25
): Promise<Transaction[]> {
  try {
    const res = await fetch(
      `${MIRROR_NODE_BASE}/transactions?account.id=${accountId}&order=desc&limit=${limit}&transactiontype=CRYPTOTRANSFER`,
      { headers: { accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      transactions: Array<{
        transaction_id: string;
        result: string;
        consensus_timestamp: string;
        transfers: Array<{ account: string; amount: number }>;
        memo_base64?: string;
      }>;
    };

    return data.transactions.map((tx) => ({
      transactionId: tx.transaction_id,
      result: tx.result,
      consensusTimestamp: tx.consensus_timestamp,
      transfers: tx.transfers,
      memo: tx.memo_base64
        ? Buffer.from(tx.memo_base64, 'base64').toString('utf-8')
        : undefined,
    }));
  } catch {
    return [];
  }
}

/** Get a specific transaction by ID */
export async function getTransaction(txId: string): Promise<Transaction | null> {
  try {
    // Mirror node expects format: 0.0.xxx@timestamp.nanos
    const normalizedId = txId.replace('@', '-').replace('.', '-');
    const res = await fetch(`${MIRROR_NODE_BASE}/transactions/${normalizedId}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      transactions: Array<{
        transaction_id: string;
        result: string;
        consensus_timestamp: string;
        transfers: Array<{ account: string; amount: number }>;
        memo_base64?: string;
      }>;
    };

    if (!data.transactions?.length) return null;
    const tx = data.transactions[0];
    return {
      transactionId: tx.transaction_id,
      result: tx.result,
      consensusTimestamp: tx.consensus_timestamp,
      transfers: tx.transfers,
      memo: tx.memo_base64
        ? Buffer.from(tx.memo_base64, 'base64').toString('utf-8')
        : undefined,
    };
  } catch {
    return null;
  }
}

/** Format tinybars to HBAR string */
export function formatHbar(tinybars: number): string {
  return (tinybars / 1e8).toFixed(8).replace(/\.?0+$/, '') + ' HBAR';
}

/** Format tinybars to USD approximation (testnet, rough) */
export function formatUsd(tinybars: number, hbarPriceUsd = 0.05): string {
  const usd = (tinybars / 1e8) * hbarPriceUsd;
  return '$' + usd.toFixed(6);
}

/** Get HashScan URL */
export function hashScanUrl(txId: string, network = 'testnet'): string {
  return `https://hashscan.io/${network}/transaction/${txId}`;
}

/** Get HashScan account URL */
export function hashScanAccountUrl(accountId: string, network = 'testnet'): string {
  return `https://hashscan.io/${network}/account/${accountId}`;
}
