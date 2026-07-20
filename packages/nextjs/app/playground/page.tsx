"use client";

import { useState, useEffect } from "react";
import { fetch402, PaymentChallenge, DemoWallet, getHashScanUrl } from "@/lib/x402-client";

interface CatalogItem {
  id: string;
  endpoint: string;
  name: string;
  description: string;
  amountHbar: string;
}

const DEMO_WALLET: DemoWallet = {
  accountId: process.env.NEXT_PUBLIC_DEMO_CLIENT_ID || "",
  privateKey: process.env.NEXT_PUBLIC_DEMO_CLIENT_KEY || "",
};

export default function Playground() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [challenge, setChallenge] = useState<PaymentChallenge | null>(null);
  const [finalData, setFinalData] = useState<any>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then(r => r.json())
      .then(d => setCatalog(d.resources))
      .catch(e => console.error(e));
  }, []);

  const handleStartRequest = async () => {
    if (!selectedEndpoint) return;
    
    setIsLoading(true);
    setError(null);
    setChallenge(null);
    setFinalData(null);
    setTxId(null);
    setStep(2);

    try {
      // Step 2: Make initial request, expect 402
      const res = await fetch(selectedEndpoint);
      
      if (res.status === 402) {
        const pr = res.headers.get('payment-required');
        if (pr) {
          const decoded = JSON.parse(atob(pr)) as PaymentChallenge;
          setChallenge(decoded);
          setStep(3); // Waiting for user to sign & pay
        } else {
          setError("402 response missing payment-required header");
        }
      } else {
        setError(`Expected 402, got ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignAndPay = async () => {
    if (!challenge || !selectedEndpoint) return;
    if (!DEMO_WALLET.accountId || !DEMO_WALLET.privateKey) {
      setError("Demo wallet not configured in environment variables (.env)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 3 & 4: fetch402 handles the signing and retry
      const result = await fetch402(selectedEndpoint, DEMO_WALLET);

      if (result.ok) {
        setFinalData(result.data);
        setTxId(result.transactionId || null);
        setStep(5);
      } else {
        setError(`Payment failed: ${result.error || result.status}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "48px 24px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "32px" }}>Playground</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        
        {/* Left Col: Actions */}
        <div className="flex-col gap-8">
          
          {/* Step 1 */}
          <div className="glass-panel" style={{ padding: "24px", opacity: step === 1 ? 1 : 0.6 }}>
            <h2 className="text-gradient-accent" style={{ fontSize: "1.25rem", marginBottom: "16px" }}>
              1. Choose a Resource
            </h2>
            <div className="flex-col gap-2">
              {catalog.map(item => (
                <button 
                  key={item.id}
                  onClick={() => setSelectedEndpoint(item.endpoint)}
                  style={{
                    background: selectedEndpoint === item.endpoint ? "rgba(0, 255, 136, 0.1)" : "transparent",
                    border: `1px solid ${selectedEndpoint === item.endpoint ? "var(--accent-primary)" : "var(--border-color)"}`,
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "white"
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div style={{ fontWeight: "bold" }}>{item.name}</div>
                    <div style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                      {item.amountHbar} HBAR
                    </div>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {item.endpoint}
                  </div>
                </button>
              ))}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: "100%", marginTop: "24px" }}
              disabled={!selectedEndpoint || isLoading || step > 1}
              onClick={handleStartRequest}
            >
              Send Request
            </button>
          </div>

          {/* Step 3 (Payment) */}
          <div className="glass-panel" style={{ padding: "24px", opacity: step === 3 ? 1 : 0.6 }}>
            <h2 className="text-gradient-accent" style={{ fontSize: "1.25rem", marginBottom: "16px" }}>
              2. Client Signs Payment
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "16px" }}>
              The client (AI Agent) parses the challenge, creates a Hedera TransferTransaction, and signs it. It then retries the request.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: "100%" }}
              disabled={step !== 3 || isLoading}
              onClick={handleSignAndPay}
            >
              {isLoading ? "Settling on Hedera..." : "Sign & Retry Request"}
            </button>
          </div>

        </div>

        {/* Right Col: Console / Results */}
        <div className="glass-panel flex-col" style={{ height: "600px", overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.5)" }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>Terminal</span>
          </div>
          
          <div style={{ padding: "24px", overflowY: "auto", flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
            
            {error && (
              <div style={{ color: "#ff4444", marginBottom: "24px" }}>
                [Error] {error}
              </div>
            )}

            {step >= 2 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ color: "var(--text-tertiary)" }}>$ GET {selectedEndpoint}</div>
                {challenge ? (
                  <div style={{ color: "#ffaa00", marginTop: "8px" }}>
                    &lt; 402 Payment Required<br/>
                    &lt; payment-required: [base64_encoded_challenge]<br/><br/>
                    <div style={{ color: "var(--text-secondary)" }}>
                      // Decoded Challenge:<br/>
                      {JSON.stringify(challenge, null, 2)}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--text-secondary)", marginTop: "8px" }}>Waiting for response...</div>
                )}
              </div>
            )}

            {step >= 5 && finalData && (
              <div style={{ marginBottom: "24px", borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
                <div style={{ color: "var(--text-tertiary)" }}>
                  $ GET {selectedEndpoint}<br/>
                  &gt; payment-signature: [base64_signed_transaction]
                </div>
                <div style={{ color: "var(--accent-primary)", marginTop: "8px" }}>
                  &lt; 200 OK<br/>
                  &lt; payment-response: [receipt]<br/>
                  {txId && <span>&lt; x-transaction-id: {txId}</span>}
                  <br/><br/>
                  <div style={{ color: "var(--text-primary)" }}>
                    {JSON.stringify(finalData, null, 2)}
                  </div>
                </div>
                
                {txId && (
                  <div style={{ marginTop: "24px", padding: "16px", border: "1px solid var(--accent-secondary)", borderRadius: "8px" }}>
                    <div style={{ color: "var(--accent-secondary)", marginBottom: "8px" }}>✓ Transaction Settled</div>
                    <a href={getHashScanUrl(txId)} target="_blank" style={{ textDecoration: "underline", color: "var(--text-primary)" }}>
                      View on HashScan
                    </a>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
