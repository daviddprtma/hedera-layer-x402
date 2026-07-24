import Link from "next/link";
import PaymentFlow from "@/components/PaymentFlow";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: "120px 0", textAlign: "center", position: "relative" }}>
        <div className="container flex flex-col items-center gap-8">
          <div style={{
            display: "inline-block",
            padding: "8px 16px",
            background: "var(--bg-surface)",
            borderRadius: "999px",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            fontWeight: 500,
            marginBottom: "16px"
          }}>
            <span className="text-gradient-accent">✦ New</span> — 402 Payment Required for AI Agents
          </div>
          
          <h1 style={{ fontSize: "4.5rem", lineHeight: 1.1, maxWidth: "800px" }}>
            The Internet's Native <br />
            <span className="text-gradient-accent animate-float" style={{ display: "inline-block" }}>Payment Layer</span>
          </h1>
          
          <p style={{ 
            fontSize: "1.25rem", 
            color: "var(--text-secondary)", 
            maxWidth: "600px",
            lineHeight: 1.6 
          }}>
            x402 turns the 402 Payment Required status code into a working payment standard for autonomous commerce. Software paying software directly.
          </p>
          
          <div className="flex gap-4" style={{ marginTop: "32px" }}>
            <Link href="/playground" className="btn btn-primary" style={{ fontSize: "1.125rem", padding: "16px 32px" }}>
              Try Live Demo
            </Link>
            <a href="https://github.com/daviddprtma/hedera-layer-x402" target="_blank" className="btn btn-outline" style={{ fontSize: "1.125rem", padding: "16px 32px" }}>
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Protocol Flow Section */}
      <section style={{ padding: "80px 0" }}>
        <div className="container">
          <h2 style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "64px" }}>
            How it works
          </h2>
          <div className="glass-panel" style={{ padding: "48px", textAlign: "center" }}>
            <PaymentFlow />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "80px 0 120px" }}>
        <div className="container">
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "32px"
          }}>
            <div className="glass-panel" style={{ padding: "32px" }}>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "16px" }} className="text-gradient-accent">Micro-payments</h3>
              <p style={{ color: "var(--text-secondary)" }}>
                Settlement in milliseconds via Hedera. predictable $0.0001 fees make per-API-call payments economically viable.
              </p>
            </div>
            <div className="glass-panel" style={{ padding: "32px" }}>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "16px" }} className="text-gradient-accent">Agent Native</h3>
              <p style={{ color: "var(--text-secondary)" }}>
                No humans in the loop. Agents can discover resources, negotiate prices, and pay autonomously using the x402 standard.
              </p>
            </div>
            <div className="glass-panel" style={{ padding: "32px" }}>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "16px" }} className="text-gradient-accent">Stablecoin Ready</h3>
              <p style={{ color: "var(--text-secondary)" }}>
                Settle in native HBAR or HTS USDC. Fixed fees apply to both, enabling reliable and predictable unit economics.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
