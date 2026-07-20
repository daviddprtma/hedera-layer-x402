export default function PaymentFlow() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <svg viewBox="0 0 800 300" width="100%" height="100%">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-secondary)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Client */}
        <g transform="translate(100, 100)">
          <rect x="-60" y="-40" width="120" height="80" rx="12" fill="var(--bg-base)" stroke="var(--border-color)" strokeWidth="2" />
          <text x="0" y="5" fill="var(--text-primary)" fontSize="16" fontWeight="bold" textAnchor="middle">AI Agent</text>
          <text x="0" y="25" fill="var(--text-tertiary)" fontSize="12" textAnchor="middle">(Client)</text>
        </g>

        {/* Server */}
        <g transform="translate(700, 100)">
          <rect x="-60" y="-40" width="120" height="80" rx="12" fill="var(--bg-base)" stroke="var(--border-color)" strokeWidth="2" />
          <text x="0" y="5" fill="var(--text-primary)" fontSize="16" fontWeight="bold" textAnchor="middle">API Server</text>
          <text x="0" y="25" fill="var(--text-tertiary)" fontSize="12" textAnchor="middle">(Resource)</text>
        </g>

        {/* Hedera */}
        <g transform="translate(400, 250)">
          <rect x="-60" y="-30" width="120" height="60" rx="12" fill="var(--bg-base)" stroke="url(#gradient)" strokeWidth="2" filter="url(#glow)" />
          <text x="0" y="5" fill="var(--text-primary)" fontSize="16" fontWeight="bold" textAnchor="middle">Hedera</text>
        </g>

        {/* Facilitator */}
        <g transform="translate(400, -20)">
          <rect x="-60" y="-30" width="120" height="60" rx="12" fill="var(--bg-base)" stroke="var(--border-color)" strokeWidth="2" />
          <text x="0" y="5" fill="var(--text-primary)" fontSize="16" fontWeight="bold" textAnchor="middle">Facilitator</text>
        </g>

        {/* Arrows and Labels */}
        
        {/* 1. Request */}
        <path d="M 160 80 L 640 80" stroke="var(--text-tertiary)" strokeWidth="2" strokeDasharray="4 4" fill="none" markerEnd="url(#arrow)" />
        <text x="400" y="70" fill="var(--text-secondary)" fontSize="12" textAnchor="middle">1. GET /api/data</text>

        {/* 2. 402 Challenge */}
        <path d="M 640 120 L 160 120" stroke="var(--accent-secondary)" strokeWidth="2" fill="none" markerEnd="url(#arrow-accent-sec)" />
        <text x="400" y="140" fill="var(--text-primary)" fontSize="12" textAnchor="middle">2. 402 Payment Required</text>
        <text x="400" y="155" fill="var(--accent-secondary)" fontSize="10" textAnchor="middle">challenge JSON</text>

        {/* 3. Retry with payment */}
        <path d="M 160 180 L 340 230" stroke="var(--accent-primary)" strokeWidth="2" fill="none" markerEnd="url(#arrow-accent-pri)" />
        <text x="210" y="225" fill="var(--text-primary)" fontSize="12" textAnchor="middle">3. Sign & Pay</text>

        {/* 4. Facilitator Settle */}
        <path d="M 460 230 L 640 180" stroke="var(--accent-primary)" strokeWidth="2" fill="none" markerEnd="url(#arrow-accent-pri)" filter="url(#glow)" />
        <text x="580" y="225" fill="var(--text-primary)" fontSize="12" textAnchor="middle">4. Settle / 200 OK</text>

        {/* Markers */}
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-tertiary)" />
        </marker>
        <marker id="arrow-accent-pri" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-primary)" />
        </marker>
        <marker id="arrow-accent-sec" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-secondary)" />
        </marker>

      </svg>
    </div>
  );
}
