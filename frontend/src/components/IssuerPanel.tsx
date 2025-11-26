import { useState } from "react";
import { apiPost } from "../api/client";

type Credential = {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  status: string;
};

export function IssuerPanel() {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [error, setError] = useState<string | null>(null);

  const issueSampleCredential = async () => {
    setError(null);
    try {
      const body = {
        credentialId: "demo-cred-1",
        issuerDid: "did:chainshield:issuer-demo",
        holderDid: "did:chainshield:user-demo",
        ipfsHash: "QmDemoHash"
      };
      const res = await apiPost<Credential>("/credentials", body);
      setCredential(res);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h2>Issuer</h2>
      <p>Issue a demo credential to a user.</p>
      <button onClick={issueSampleCredential}>Issue demo credential</button>
      {credential && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          <p>
            <strong>ID:</strong> {credential.credentialId}
          </p>
          <p>
            <strong>Issuer DID:</strong> {credential.issuerDid}
          </p>
          <p>
            <strong>Holder DID:</strong> {credential.holderDid}
          </p>
          <p>
            <strong>Status:</strong> {credential.status}
          </p>
        </div>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}


