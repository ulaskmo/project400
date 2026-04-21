import type { TrustLevel } from "../api/client";

interface TrustBadgeProps {
  level?: TrustLevel | string | null;
  size?: "sm" | "md";
  showLabel?: boolean;
  title?: string;
}

const CONFIG: Record<
  TrustLevel,
  { label: string; bg: string; border: string; color: string; icon: string }
> = {
  unverified: {
    label: "Unverified",
    bg: "rgba(156,163,175,0.12)",
    border: "rgba(156,163,175,0.35)",
    color: "#6b7280",
    icon: "?",
  },
  verified: {
    label: "Verified",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.35)",
    color: "#2563eb",
    icon: "✓",
  },
  accredited: {
    label: "Accredited",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.45)",
    color: "#059669",
    icon: "★",
  },
};

const DESCRIPTIONS: Record<TrustLevel, string> = {
  unverified: "This party has not been verified by ChainShield administrators.",
  verified: "Identity has been confirmed by a ChainShield administrator.",
  accredited:
    "Accredited institution. Credentials from this party carry the highest trust weight.",
};

export function TrustBadge({
  level,
  size = "sm",
  showLabel = true,
  title,
}: TrustBadgeProps) {
  const normalized: TrustLevel = (
    level === "verified" || level === "accredited" ? level : "unverified"
  ) as TrustLevel;

  const cfg = CONFIG[normalized];
  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  const fontSize = size === "sm" ? "0.7rem" : "0.8125rem";
  const iconSize = size === "sm" ? "0.8rem" : "0.95rem";

  return (
    <span
      title={title ?? DESCRIPTIONS[normalized]}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: iconSize, lineHeight: 1 }}>{cfg.icon}</span>
      {showLabel && cfg.label}
    </span>
  );
}

export function describeTrustLevel(level?: TrustLevel | string | null): string {
  const normalized: TrustLevel = (
    level === "verified" || level === "accredited" ? level : "unverified"
  ) as TrustLevel;
  return DESCRIPTIONS[normalized];
}
