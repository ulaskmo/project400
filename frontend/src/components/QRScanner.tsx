import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onDetected: (text: string) => void;
  onError?: (err: string) => void;
  active: boolean;
}

const SCANNER_ID = "chainshield-qr-scanner";

export function QRScanner({ onDetected, onError, active }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!active) return;
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices.map((d) => ({ id: d.id, label: d.label || "Camera" })));
        const preferred =
          devices.find((d) => /back|rear|environment/i.test(d.label))?.id ||
          devices[0]?.id ||
          null;
        setCameraId(preferred);
      })
      .catch((e) => {
        const msg = (e as Error).message || "No camera available";
        setLocalError(msg);
        onError?.(msg);
      });
  }, [active, onError]);

  useEffect(() => {
    if (!active || !cameraId) return;
    let cancelled = false;

    const start = async () => {
      setStarting(true);
      setLocalError(null);
      try {
        const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            onDetectedRef.current(decoded);
          },
          () => {
            /* ignore per-frame non-matches */
          }
        );
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error).message || "Failed to start camera";
        setLocalError(msg);
        onError?.(msg);
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          try {
            s.clear();
          } catch {
            /* ignore */
          }
        });
      }
    };
  }, [active, cameraId, onError]);

  if (!active) return null;

  return (
    <div>
      {cameras.length > 1 && (
        <div className="input-group" style={{ marginBottom: "var(--space-3)" }}>
          <label className="input-label">Camera</label>
          <select
            className="input"
            value={cameraId ?? ""}
            onChange={(e) => setCameraId(e.target.value)}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div
        id={SCANNER_ID}
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "var(--surface-inset)",
          minHeight: 280,
          border: "1px solid var(--surface-border)",
        }}
      />
      {starting && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--gray-500)",
            marginTop: "var(--space-2)",
          }}
        >
          Starting camera...
        </p>
      )}
      {localError && (
        <p
          style={{
            textAlign: "center",
            color: "var(--danger-500)",
            fontSize: "0.8rem",
            marginTop: "var(--space-2)",
          }}
        >
          {localError}
        </p>
      )}
      <p
        style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--gray-500)",
          marginTop: "var(--space-3)",
        }}
      >
        Point the camera at a credential QR code.
      </p>
    </div>
  );
}

/**
 * Extract the credential ID from various scan payloads:
 * - Raw credential id: "cred-xxx"
 * - Verify URL: "https://.../verify/cred-xxx" or "...#/verify/cred-xxx"
 * - Query string: "...?id=cred-xxx"
 */
export function extractCredentialId(text: string): string {
  const trimmed = text.trim();
  // Try URL parse
  try {
    const url = new URL(trimmed);
    // /verify/:id or hash #/verify/:id
    const pathMatch = url.pathname.match(/\/verify\/([^/?#]+)/);
    if (pathMatch) return decodeURIComponent(pathMatch[1]);
    const hashMatch = url.hash.match(/\/verify\/([^/?#]+)/);
    if (hashMatch) return decodeURIComponent(hashMatch[1]);
    const queryId = url.searchParams.get("id");
    if (queryId) return queryId;
  } catch {
    /* not a URL */
  }
  return trimmed;
}
