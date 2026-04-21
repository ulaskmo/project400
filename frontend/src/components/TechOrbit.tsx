import type { CSSProperties } from "react";

/**
 * Solar-system style animation for the login page.
 * ChainShield logo sits at the center; six tech "planets" orbit
 * across three rings with different speeds and directions.
 */

interface Planet {
  label: string;
  ring: 1 | 2 | 3;
  // 0-360 starting angle around the orbit
  startDeg: number;
  // color used behind the icon
  tint: string;
  // reverse rotation so some planets go counter-clockwise
  reverse?: boolean;
  icon: JSX.Element;
}

// ---------- Icons ----------

const W3CIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M4 12c4-5 12-5 16 0" />
    <path d="M4 12c4 5 12 5 16 0" />
    <path d="M12 3c-3 3-3 15 0 18" />
    <path d="M12 3c3 3 3 15 0 18" />
  </svg>
);

const DidIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="4" cy="6" r="1.6" />
    <circle cx="20" cy="6" r="1.6" />
    <circle cx="4" cy="18" r="1.6" />
    <circle cx="20" cy="18" r="1.6" />
    <path d="M5.3 7 10 11.2" />
    <path d="M18.7 7 14 11.2" />
    <path d="M5.3 17 10 12.8" />
    <path d="M18.7 17 14 12.8" />
  </svg>
);

const IntegrityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6l-8-4Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const SsiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v4" />
    <path d="M12 16.5v4" />
    <path d="M3.5 12h4" />
    <path d="M16.5 12h4" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const BlockchainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.4" />
    <rect x="14" y="3" width="7" height="7" rx="1.4" />
    <rect x="3" y="14" width="7" height="7" rx="1.4" />
    <rect x="14" y="14" width="7" height="7" rx="1.4" />
    <path d="M10 6.5h4" />
    <path d="M10 17.5h4" />
    <path d="M6.5 10v4" />
    <path d="M17.5 10v4" />
  </svg>
);

// ---------- Configuration ----------

const PLANETS: Planet[] = [
  { label: "W3C", ring: 1, startDeg: 210, tint: "#ef4444", icon: <W3CIcon /> },
  { label: "DID", ring: 1, startDeg: 60, tint: "#3b82f6", icon: <DidIcon /> },
  { label: "Integrity", ring: 2, startDeg: 0, tint: "#14b8a6", icon: <IntegrityIcon /> },
  { label: "SSI", ring: 2, startDeg: 180, tint: "#f97316", reverse: true, icon: <SsiIcon /> },
  { label: "Wallet", ring: 3, startDeg: 45, tint: "#a855f7", icon: <WalletIcon /> },
  { label: "Blockchain", ring: 3, startDeg: 225, tint: "#2563eb", reverse: true, icon: <BlockchainIcon /> },
];

// Ring radii in % of the container's half-size.
// i.e. 30 means the planet orbits at 30% out from center.
const RING_RADIUS = { 1: 22, 2: 32, 3: 42 };

const RING_DURATION = { 1: 26, 2: 40, 3: 58 };

const DOTS: { size: number; color: string; top: string; left: string; delay: number }[] = [
  { size: 10, color: "#f59e0b", top: "18%", left: "55%", delay: 0 },
  { size: 8, color: "#ef4444", top: "22%", left: "45%", delay: 1.2 },
  { size: 10, color: "#8b5cf6", top: "44%", left: "14%", delay: 0.6 },
  { size: 8, color: "#facc15", top: "48%", left: "82%", delay: 2.0 },
  { size: 10, color: "#10b981", top: "62%", left: "80%", delay: 1.6 },
  { size: 8, color: "#ef4444", top: "72%", left: "74%", delay: 0.3 },
  { size: 10, color: "#3b82f6", top: "80%", left: "22%", delay: 2.4 },
  { size: 10, color: "#8b5cf6", top: "82%", left: "56%", delay: 1.0 },
];

export function TechOrbit() {
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 520,
        aspectRatio: "1 / 1",
        margin: "0 auto",
        color: "#e5e7eb",
      }}
    >
      <style>{techOrbitStyles}</style>

      {/* Dashed orbit rings - SVG stays crisp at any size */}
      <svg
        viewBox="-50 -50 100 100"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <circle cx="0" cy="0" r={RING_RADIUS[1]} fill="none" stroke="rgba(148,163,184,0.45)" strokeWidth="0.3" strokeDasharray="1 1.2" />
        <circle cx="0" cy="0" r={RING_RADIUS[2]} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.3" strokeDasharray="1 1.2" />
        <circle cx="0" cy="0" r={RING_RADIUS[3]} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="0.3" strokeDasharray="1 1.2" />
      </svg>

      {/* Floating coloured dots (decorative) */}
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="techorbit-dot"
          style={{
            width: d.size,
            height: d.size,
            top: d.top,
            left: d.left,
            background: d.color,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}

      {/* Sun / center - soft halo + ChainShield logo */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "26%",
          aspectRatio: "1 / 1",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.55) 0%, rgba(249,115,22,0.25) 45%, rgba(249,115,22,0) 75%)",
          filter: "blur(3px)",
          animation: "techorbit-sun-pulse 4.5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <SunMark />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "18%",
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 30%, #fff7ed 0%, #fde68a 35%, #fbbf24 65%, #f59e0b 100%)",
          boxShadow:
            "inset 0 3px 10px rgba(255,255,255,0.8), inset 0 -8px 18px rgba(180,83,9,0.45), 0 0 30px rgba(251,191,36,0.7), 0 0 70px rgba(249,115,22,0.5)",
        }}
      />

      {/* Planets */}
      {PLANETS.map((p) => {
        const ringPct = RING_RADIUS[p.ring];
        const duration = RING_DURATION[p.ring];
        // Negative animation-delay stages each planet at its start angle
        // without fighting the animated transform.
        const delay = -(p.startDeg / 360) * duration;

        // Outer wrapper spans the whole container and rotates around its
        // own center; the planet sits at ringPct% to the right of center.
        const orbitStyle: CSSProperties = {
          position: "absolute",
          inset: 0,
          animation: `techorbit-spin ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          animationDirection: p.reverse ? "reverse" : "normal",
          pointerEvents: "none",
        };

        // Planet is positioned at center + ringPct% horizontally.
        // Counter-rotation keeps the icon upright.
        const planetStyle: CSSProperties = {
          position: "absolute",
          top: "50%",
          left: `${50 + ringPct}%`,
          width: "13%",
          aspectRatio: "1 / 1",
          animation: `techorbit-spin-counter ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          animationDirection: p.reverse ? "reverse" : "normal",
        };

        return (
          <div key={p.label} style={orbitStyle}>
            <div style={planetStyle}>
              <Planet label={p.label} tint={p.tint}>
                {p.icon}
              </Planet>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SunMark() {
  // Alternating long/short rays around the sun disc.
  const rays = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "30%",
        aspectRatio: "1 / 1",
        pointerEvents: "none",
        animation: "techorbit-sun-rays 22s linear infinite",
      }}
    >
      {rays.map((i) => {
        const long = i % 2 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `rotate(${i * (360 / 16)}deg)`,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                width: long ? "8%" : "5%",
                height: long ? "24%" : "16%",
                transform: "translate(-50%, -30%)",
                borderRadius: "999px",
                background: long
                  ? "linear-gradient(to top, rgba(251,191,36,0) 0%, rgba(251,191,36,0.95) 55%, #fff7ed 100%)"
                  : "linear-gradient(to top, rgba(249,115,22,0) 0%, rgba(249,115,22,0.85) 60%, #fbbf24 100%)",
                filter: "blur(0.4px) drop-shadow(0 0 6px rgba(251,191,36,0.65))",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Planet({
  label,
  tint,
  children,
}: {
  label: string;
  tint: string;
  children: JSX.Element;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: `0 6px 22px rgba(0,0,0,0.45), 0 0 0 2px ${tint}33, 0 0 28px ${tint}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tint,
          padding: "22%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: "100%", height: "100%" }}>{children}</div>
      </div>
      <span
        style={{
          position: "absolute",
          top: "112%",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "0.6rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "rgba(226,232,240,0.9)",
          background: "rgba(15,23,42,0.8)",
          padding: "2px 7px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          border: `1px solid ${tint}55`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const techOrbitStyles = `
@keyframes techorbit-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes techorbit-spin-counter {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(-360deg); }
}
@keyframes techorbit-sun-pulse {
  0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 1;    transform: translate(-50%, -50%) scale(1.05); }
}
@keyframes techorbit-sun-rays {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
.techorbit-dot {
  position: absolute;
  border-radius: 50%;
  filter: blur(0.3px);
  box-shadow: 0 0 12px currentColor;
  animation: techorbit-float 6s ease-in-out infinite;
}
@keyframes techorbit-float {
  0%, 100% { transform: translateY(0); opacity: 0.85; }
  50%      { transform: translateY(-8px); opacity: 1; }
}
`;
