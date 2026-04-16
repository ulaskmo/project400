/**
 * Base URL for verification links in QR codes.
 * Set VITE_APP_URL when deploying so QR codes work when scanned from phones.
 * Example: VITE_APP_URL=https://chainshield.vercel.app
 */
export const getAppBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.startsWith("http")) {
    return envUrl.replace(/\/$/, "");
  }
  return window.location.origin;
};

export const getVerificationUrl = (credentialId: string): string => {
  return `${getAppBaseUrl()}/#/verify/${encodeURIComponent(credentialId)}`;
};
