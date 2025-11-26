import { useState } from "react";
import { apiGet, apiPost } from "../api/client";

type DidRecord = {
  did: string;
  publicKey: string;
  createdAt: string;
};

export function UserPanel() {
  const [health, setHealth] = useState<string | null>(null);
  const [did, setDid] = useState<DidRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setError(null);
    try {
      const res = await apiGet<{ status: string }>("/health");
      setHealth(res.status);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const createDid = async () => {
    setError(null);
    try {
      const record = await apiPost<DidRecord>("/dids");
      setDid(record);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h2>User</h2>
      <p>Basic actions for an identity owner.</p>
      <button onClick={checkHealth}>Check API health</button>
      {health && <p>API status: {health}</p>}

      <button onClick={createDid} style={{ marginTop: "0.75rem" }}>
        Create DID
      </button>
      {did && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          <p>
            <strong>DID:</strong> {did.did}
          </p>
          <p>
            <strong>Public key:</strong> {did.publicKey}
          </p>
          <p>
            <strong>Created at:</strong> {did.createdAt}
          </p>
        </div>
      )}

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}


