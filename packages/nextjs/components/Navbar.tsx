"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--bg-surface)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-color)",
      padding: "16px 0",
    }}>
      <div className="container flex justify-between items-center">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontWeight: "bold",
            fontFamily: "var(--font-display)"
          }}>
            L
          </div>
          <span style={{ 
            fontFamily: "var(--font-display)", 
            fontSize: "1.25rem", 
            fontWeight: 700 
          }}>
            Layer402
          </span>
        </Link>

        <div className="flex gap-8" style={{ fontWeight: 500 }}>
          <Link 
            href="/dashboard"
            style={{ 
              color: pathname === "/dashboard" ? "var(--text-primary)" : "var(--text-secondary)"
            }}
          >
            Dashboard
          </Link>
          <Link 
            href="/playground"
            style={{ 
              color: pathname === "/playground" ? "var(--text-primary)" : "var(--text-secondary)"
            }}
          >
            Playground
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/playground" className="btn btn-primary">
            Try Demo
          </Link>
        </div>
      </div>
    </nav>
  );
}
