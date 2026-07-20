"use client";

import { useEffect, useState } from "react";
import { getAccountBalance, getAccountTransactions, AccountBalance, Transaction, formatHbar, hashScanUrl, hashScanAccountUrl } from "@/lib/hedera-mirror";

// This is the client ID from our environment, simulating our "connected wallet"
const DEMO_ACCOUNT_ID = process.env.NEXT_PUBLIC_DEMO_CLIENT_ID || "0.0.YOUR_CLIENT_ID";

export default function Dashboard() {
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!DEMO_ACCOUNT_ID || DEMO_ACCOUNT_ID === "0.0.YOUR_CLIENT_ID") {
        setLoading(false);
        return;
      }
      
      try {
        const bal = await getAccountBalance(DEMO_ACCOUNT_ID);
        const txs = await getAccountTransactions(DEMO_ACCOUNT_ID, 20);
        setBalance(bal);
        setTransactions(txs);
      } catch (err) {
        console.error("Failed to load Hedera data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="container" style={{ padding: "48px 24px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "32px" }}>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
        
        {/* Account Info */}
        <div className="glass-panel flex-col" style={{ padding: "24px", height: "fit-content" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "16px" }}>Connected Account</h2>
          
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-mono)" }} className="text-gradient">
              {DEMO_ACCOUNT_ID}
            </div>
            <a 
              href={hashScanAccountUrl(DEMO_ACCOUNT_ID)} 
              target="_blank" 
              style={{ color: "var(--accent-secondary)", fontSize: "0.875rem" }}
            >
              View on HashScan ↗
            </a>
          </div>

          <div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-tertiary)" }}>Current Balance</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }} className="text-gradient-accent">
              {balance ? formatHbar(balance.balance) : "---"}
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "24px" }}>Transaction History</h2>
          
          {loading ? (
            <div style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "32px" }}>Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "32px" }}>
              No transactions found. <br />
              Head to the Playground to make your first x402 payment!
            </div>
          ) : (
            <div className="flex-col gap-4">
              {transactions.map(tx => {
                // Find amount paid by this account (negative transfer)
                const transfer = tx.transfers.find(t => t.account === DEMO_ACCOUNT_ID);
                const amount = transfer ? Math.abs(transfer.amount) : 0;
                
                return (
                  <div key={tx.transactionId} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "16px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)"
                  }}>
                    <div className="flex-col gap-2">
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {tx.memo ? tx.memo : "Unknown x402 payment"}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
                        {new Date(parseFloat(tx.consensusTimestamp) * 1000).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex-col items-center gap-2">
                      <div style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                        -{formatHbar(amount)}
                      </div>
                      <a 
                        href={hashScanUrl(tx.transactionId)}
                        target="_blank"
                        style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textDecoration: "underline" }}
                      >
                        {tx.transactionId}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
