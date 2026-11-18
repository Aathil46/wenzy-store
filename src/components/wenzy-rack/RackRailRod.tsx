import React from 'react'

interface RackRailRodProps {
  className?: string
}

/**
 * Curved metallic clothing rail rod inspired by the reference site (<svg class="sr-rodsvg">).
 * Styled with realistic multi-stop chrome/steel linear gradients and industrial mounting brackets.
 */
export default function RackRailRod({ className = '' }: RackRailRodProps) {
  return (
    <div className={`relative w-full pointer-events-none select-none ${className}`}>
      {/* SVG Industrial Metallic Rod */}
      <svg
        className="w-full h-12 overflow-visible"
        viewBox="0 0 1440 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Multi-stop Brushed Chrome Gradient */}
          <linearGradient id="wenzy-chrome-rod" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="75%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* Wall Flange / Mounting Bracket Gradient */}
          <linearGradient id="wenzy-bracket-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Clean subtle contact shadow */}
          <filter id="rod-drop-shadow" x="-5%" y="-20%" width="110%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Left Wall Mounting Flange */}
        <rect
          x="0"
          y="6"
          width="14"
          height="28"
          rx="3"
          fill="url(#wenzy-bracket-grad)"
          stroke="#0F172A"
          strokeWidth="1"
        />

        {/* Right Wall Mounting Flange */}
        <rect
          x="1426"
          y="6"
          width="14"
          height="28"
          rx="3"
          fill="url(#wenzy-bracket-grad)"
          stroke="#0F172A"
          strokeWidth="1"
        />

        {/* Main Curved Rail Rod with realistic natural sag (sag = ~22px in center) */}
        <path
          d="M 12 18 Q 720 38 1428 18"
          stroke="url(#wenzy-chrome-rod)"
          strokeWidth="8"
          strokeLinecap="round"
          filter="url(#rod-drop-shadow)"
        />

        {/* Specular Highlight along top edge */}
        <path
          d="M 16 16 Q 720 36 1424 16"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
      </svg>
    </div>
  )
}
