import { useState } from "react";
import "./App.css";
import { UserPanel } from "./components/UserPanel";
import { IssuerPanel } from "./components/IssuerPanel";
import { VerifierPanel } from "./components/VerifierPanel";

type Tab = "user" | "issuer" | "verifier";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("user");

  return (
    <div className="App">
      <header>
        <h1>ChainShield – SSI Demo</h1>
        <p style={{ maxWidth: 600 }}>
          Simple demo UI showing how a user, issuer, and verifier would interact
          with the ChainShield backend.
        </p>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === "user" ? "tab active" : "tab"}
          onClick={() => setActiveTab("user")}
        >
          User
        </button>
        <button
          className={activeTab === "issuer" ? "tab active" : "tab"}
          onClick={() => setActiveTab("issuer")}
        >
          Issuer
        </button>
        <button
          className={activeTab === "verifier" ? "tab active" : "tab"}
          onClick={() => setActiveTab("verifier")}
        >
          Verifier
        </button>
      </nav>

      <main>
        {activeTab === "user" && <UserPanel />}
        {activeTab === "issuer" && <IssuerPanel />}
        {activeTab === "verifier" && <VerifierPanel />}
      </main>
    </div>
  );
}

export default App;
