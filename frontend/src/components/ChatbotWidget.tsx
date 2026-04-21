import { useState, useRef, useEffect } from "react";

// ---------- Icons ----------

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <path d="M12 17h.01"/>
  </svg>
);

// ---------- FAQ knowledge base ----------

interface FaqEntry {
  keywords: string[];
  question: string;
  answer: string;
}

const FAQ: FaqEntry[] = [
  {
    keywords: ["what", "chainshield", "platform", "about", "this"],
    question: "What is ChainShield?",
    answer:
      "ChainShield is a Self-Sovereign Identity (SSI) platform. You control your own digital identity (a DID), hold verifiable credentials in a personal wallet, and share them only when you choose. Credentials are signed on-chain on Polygon and can be verified by anyone with a QR code.",
  },
  {
    keywords: ["did", "decentralized", "identifier", "identity", "what is my"],
    question: "What is a DID?",
    answer:
      "A DID (Decentralized Identifier) is your personal on-chain identity — like an email address, but owned only by you. Yours looks like `did:chainshield:...`. You'll find it on your Wallet page, and you can copy it with the Copy button to share with issuers.",
  },
  {
    keywords: ["add", "credential", "self", "attest", "new", "create", "wallet"],
    question: "How do I add a credential?",
    answer:
      "Go to the Wallet tab and click the \"+ Add\" button on the Credential Wallet card. You can fill in details (title, description, issuer, date) and optionally attach a PDF or image. Self-attested credentials are useful for personal documents. For verified credentials from a third party, share your DID with an issuer and they'll send you one.",
  },
  {
    keywords: ["share", "credential", "qr", "scan", "send", "verify", "link"],
    question: "How do I share a credential?",
    answer:
      "Three ways:\n1. Open any credential and click \"View QR Code\" — anyone can scan the QR to verify it.\n2. Click \"Copy Link\" to get a verification URL you can paste anywhere.\n3. In the Friends tab, open a chat and use the paperclip icon to attach a credential directly to a message.",
  },
  {
    keywords: ["friend", "add", "request", "connect"],
    question: "How do I add a friend?",
    answer:
      "Switch to the Friends sub-tab on your Wallet page. Click \"Add Friend\", enter your friend's email, and send a request. They'll see it under Requests and can accept or decline. Once accepted you can message them and share credentials.",
  },
  {
    keywords: ["message", "chat", "dm", "talk", "send"],
    question: "How do messaging / DMs work?",
    answer:
      "Open the Friends tab, click \"Message\" next to any friend, and start chatting. Messages are stored in our database so both of you can catch up any time. You can attach credentials to messages using the paperclip icon.",
  },
  {
    keywords: ["issuer", "verifier", "role", "holder", "what is", "difference"],
    question: "What's the difference between holder, issuer, and verifier?",
    answer:
      "• **Holder**: regular user who keeps credentials in their wallet (that's probably you).\n• **Issuer**: an organisation that issues credentials (e.g. a university giving degrees).\n• **Verifier**: a party that checks credentials (e.g. an employer scanning a QR code).\nYou pick your role when you register.",
  },
  {
    keywords: ["blockchain", "polygon", "chain", "onchain", "on-chain", "where", "stored"],
    question: "Where is my data stored?",
    answer:
      "Credentials are anchored on the Polygon blockchain and the actual files are stored on IPFS — both decentralized so nobody can tamper with them. Your account details (email, password hash, friends, messages) live in our managed Supabase database. Your private key stays only with you.",
  },
  {
    keywords: ["forgot", "password", "reset", "email", "link"],
    question: "I forgot my password, what now?",
    answer:
      "On the login page, click \"Forgot password?\" and enter your email. We'll send you a reset link that's valid for 1 hour. Click the link, choose a new password, and you're back in.",
  },
  {
    keywords: ["revoke", "cancel", "invalid", "delete", "credential"],
    question: "Can a credential be revoked?",
    answer:
      "Yes — the original issuer can revoke a credential they issued (e.g. if it was issued in error). Revoked credentials show up with a red \"revoked\" badge and any verifier scanning the QR will immediately see they're invalid.",
  },
  {
    keywords: ["private", "key", "security", "safe", "secure"],
    question: "Is my account secure?",
    answer:
      "Passwords are hashed with bcrypt (never stored in plaintext). Authentication uses JWT tokens stored in your browser. All API traffic goes over HTTPS in production. The blockchain signatures are cryptographically verifiable by anyone.",
  },
  {
    keywords: ["cost", "free", "pay", "price", "expensive"],
    question: "Is ChainShield free?",
    answer:
      "Yes — for end users. Creating accounts, holding credentials, messaging friends, and verifying QR codes are all free. Issuers pay a tiny amount of gas to write credentials to Polygon (fractions of a cent per credential).",
  },
  {
    keywords: ["qr", "code", "scan", "verify"],
    question: "How does QR verification work?",
    answer:
      "Every credential has a unique verification URL encoded as a QR. When someone scans it, they land on a public page showing the credential's status, the issuer, and the on-chain signature. They don't need an account — they can verify instantly.",
  },
  {
    keywords: ["logout", "log", "out", "sign"],
    question: "How do I log out?",
    answer: "Click the arrow icon in the top-right corner of the header to sign out. Your credentials stay safe — next time you log in, they'll be right where you left them.",
  },
  {
    keywords: ["ipfs", "file", "pdf", "document", "upload", "attach"],
    question: "What is IPFS and where are my files?",
    answer:
      "IPFS is a decentralised file storage network. When you attach a file to a credential, it's uploaded to IPFS and its hash is stored on Polygon. The file can be retrieved from any IPFS gateway using that hash — and nobody can alter it without changing the hash.",
  },
];

interface ChatMessage {
  id: string;
  from: "user" | "bot";
  text: string;
  timestamp: number;
  suggestions?: string[];
}

// ---------- Matching logic ----------

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "am", "i", "you", "my", "me", "we", "us", "your",
  "to", "of", "in", "on", "for", "with", "and", "or", "but", "do", "does",
  "how", "what", "where", "when", "why", "can", "could", "would", "should",
  "this", "that", "it", "its", "be", "been", "have", "has", "had",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function scoreFaq(entry: FaqEntry, tokens: string[]): number {
  let score = 0;
  const kwSet = new Set(entry.keywords);
  for (const t of tokens) {
    if (kwSet.has(t)) score += 2;
    else {
      // partial match against keywords
      for (const kw of entry.keywords) {
        if (kw.length > 3 && (kw.includes(t) || t.includes(kw))) {
          score += 1;
          break;
        }
      }
    }
  }
  return score;
}

function findBestAnswer(query: string): ChatMessage {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return {
      id: `bot-${Date.now()}`,
      from: "bot",
      text: "I didn't catch that. Try asking about credentials, DIDs, friends, or anything else ChainShield-related.",
      timestamp: Date.now(),
      suggestions: FAQ.slice(0, 3).map((f) => f.question),
    };
  }

  const scored = FAQ.map((f) => ({ f, score: scoreFaq(f, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0 || scored[0].score < 2) {
    return {
      id: `bot-${Date.now()}`,
      from: "bot",
      text: "I'm not sure about that one — I'm a simple FAQ bot. Here are some topics I know about:",
      timestamp: Date.now(),
      suggestions: [
        "What is ChainShield?",
        "How do I add a credential?",
        "How do I add a friend?",
        "How do I share a credential?",
      ],
    };
  }

  const best = scored[0].f;
  const suggestions =
    scored.length > 1
      ? scored.slice(1, 3).map((s) => s.f.question)
      : FAQ.filter((f) => f.question !== best.question)
          .slice(0, 2)
          .map((f) => f.question);

  return {
    id: `bot-${Date.now()}`,
    from: "bot",
    text: best.answer,
    timestamp: Date.now(),
    suggestions,
  };
}

// ---------- Markdown-lite renderer ----------

function renderRichText(text: string): React.ReactNode {
  return text.split("\n").map((line, i) => {
    // Bold **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      // Inline code `text`
      return part.split(/(`[^`]+`)/g).map((sub, k) =>
        sub.startsWith("`") && sub.endsWith("`") ? (
          <code key={`${j}-${k}`} style={{
            background: "var(--surface-inset)",
            padding: "1px 6px",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: "0.8em",
            color: "var(--brand-700)",
          }}>{sub.slice(1, -1)}</code>
        ) : (
          <span key={`${j}-${k}`}>{sub}</span>
        )
      );
    });
    return (
      <div key={i} style={{ marginBottom: i < text.split("\n").length - 1 ? 4 : 0 }}>
        {parts}
      </div>
    );
  });
}

// ---------- Component ----------

const WELCOME: ChatMessage = {
  id: "welcome",
  from: "bot",
  text: "Hi — I'm the ChainShield helper. Ask me anything about DIDs, credentials, friends, or how this platform works.",
  timestamp: Date.now(),
  suggestions: [
    "What is a DID?",
    "How do I add a credential?",
    "How do I add a friend?",
    "Where is my data stored?",
  ],
};

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const ask = (question: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      from: "user",
      text: question,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // small artificial delay for "typing" feel
    setTimeout(() => {
      const answer = findBestAnswer(question);
      setMessages((prev) => [...prev, answer]);
    }, 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    ask(q);
  };

  const reset = () => {
    setMessages([WELCOME]);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button onClick={() => setOpen(true)}
          aria-label="Open help chat"
          style={{
            position: "fixed",
            bottom: 24, right: 24,
            width: 56, height: 56,
            borderRadius: "50%",
            border: "none",
            background: "var(--brand-700)",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9998,
            transition: "transform 150ms ease, background 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--brand-800)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--brand-700)";
            e.currentTarget.style.transform = "scale(1)";
          }}>
          <span style={{ width: 24, height: 24 }}><HelpIcon /></span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Help chatbot"
          style={{
            position: "fixed",
            bottom: 24, right: 24,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 560,
            maxHeight: "calc(100vh - 48px)",
            background: "var(--surface-card)",
            borderRadius: 16,
            boxShadow: "0 20px 48px rgba(0,0,0,0.2)",
            border: "1px solid var(--surface-border)",
            display: "flex", flexDirection: "column",
            zIndex: 9998,
            overflow: "hidden",
            animation: "fadeIn 0.2s ease",
          }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px",
            background: "var(--brand-700)",
            color: "#fff",
            display: "flex", alignItems: "center", gap: 10
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <span style={{ width: 18, height: 18 }}><BotIcon /></span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.9375rem", fontWeight: 600 }}>ChainShield Helper</div>
              <div style={{ fontSize: "0.6875rem", opacity: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#22c55e", display: "inline-block"
                }} />
                Online
              </div>
            </div>
            <button onClick={reset}
              aria-label="Restart conversation"
              title="Clear chat"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff", padding: "4px 8px",
                borderRadius: 6, fontSize: "0.6875rem",
                cursor: "pointer", fontFamily: "inherit",
              }}>
              Clear
            </button>
            <button onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{
                background: "transparent", border: "none",
                color: "#fff", cursor: "pointer",
                padding: 4, display: "flex", alignItems: "center"
              }}>
              <span style={{ width: 18, height: 18 }}><XIcon /></span>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef}
            style={{
              flex: 1, overflowY: "auto",
              padding: "16px",
              background: "var(--surface-bg)",
              display: "flex", flexDirection: "column", gap: 10
            }}>
            {messages.map((m) => (
              <div key={m.id}>
                <div style={{
                  display: "flex",
                  justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "85%",
                    padding: "8px 12px",
                    borderRadius: 12,
                    borderTopRightRadius: m.from === "user" ? 4 : 12,
                    borderTopLeftRadius: m.from === "user" ? 12 : 4,
                    background: m.from === "user" ? "var(--brand-700)" : "var(--surface-card)",
                    color: m.from === "user" ? "#fff" : "var(--gray-900)",
                    border: m.from === "user" ? undefined : "1px solid var(--surface-border)",
                    fontSize: "0.8125rem", lineHeight: 1.5,
                    whiteSpace: "normal", wordBreak: "break-word"
                  }}>
                    {renderRichText(m.text)}
                  </div>
                </div>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {m.suggestions.map((s) => (
                      <button key={s} onClick={() => ask(s)}
                        style={{
                          padding: "6px 10px",
                          background: "var(--brand-50)",
                          border: "1px solid var(--brand-200)",
                          borderRadius: 999,
                          color: "var(--brand-700)",
                          fontSize: "0.75rem", fontWeight: 500,
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "background 150ms ease",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--brand-100)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "var(--brand-50)"}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit}
            style={{
              display: "flex", gap: 8,
              padding: "12px 14px",
              borderTop: "1px solid var(--surface-border)",
              background: "var(--surface-card)"
            }}>
            <input
              type="text"
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              style={{ flex: 1, fontSize: "0.875rem" }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim()}
              style={{ padding: "8px 12px" }}>
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
