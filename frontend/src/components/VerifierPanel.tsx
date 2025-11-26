import { useState } from "react";
import { apiPost } from "../api/client";

type VerificationResult = {
  credentialId: string;
  status: string;
  details?: string;
};

export function VerifierPanel() {
  const [credentialId, setCredentialId] = useState("demo-cred-1");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setError(null);
    try {
      const res = await apiPost<VerificationResult>("/verify", {
        credentialId
      });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h2>Verifier</h2>
      <p>Check whether a credential is valid.</p>
      <input
        value={credentialId}
        onChange={(e) => setCredentialId(e.target.value)}
        placeholder="credentialId"
        style={{ padding: "0.25rem", marginRight: "0.5rem" }}
      />
      <button onClick={verify}>Verify</button>
      {result && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          <p>
            <strong>ID:</strong> {result.credentialId}
          </p>
          <p>
            <strong>Status:</strong> {result.status}
          </p>
          {result.details && (
            <p>
              <strong>Details:</strong> {result.details}
            </p>
          )}
        </div>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}


