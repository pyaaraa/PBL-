import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [nonce, setNonce] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Idle");
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setError("");
    setStatus("Requesting wallet access");
    if (!window.ethereum) {
      setError("MetaMask not detected. Install the extension to continue.");
      setStatus("Idle");
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      setWalletAddress(address);

      setStatus("Fetching nonce");
      const res = await fetch(`http://localhost:5000/api/nonce/${address}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch nonce");
      }
      setNonce(data.nonce);

      setStatus("Signing message");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(data.nonce);

      setStatus("Verifying signature");
      const verifyRes = await fetch("http://localhost:5000/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, signature, nonce: data.nonce }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Verification failed");
      }

      setStatus("Authenticated");
    } catch (err) {
      setError(err.message || "Connection failed. Please try again.");
      setStatus("Idle");
    } finally {
      setIsConnecting(false);
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <div className="page">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">DA</div>
          <div>
            <p className="brand-title">DAuth</p>
            <p className="brand-subtitle">Decentralized Authentication</p>
          </div>
        </div>
        <div className="status-pill">MetaMask + Postgres</div>
      </header>

      <main className="hero">
        <section className="hero-copy">
          <p className="eyebrow">Wallet Authentication</p>
          <h1>Authenticate with your wallet in seconds.</h1>
          <p className="subhead">
            Secure, passwordless login powered by MetaMask signatures and a backend
            nonce store in PostgreSQL. Connect your wallet, sign the nonce, and
            verify ownership.
          </p>

          <div className="actions">
            <button className="primary" onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect & Verify"}
            </button>
            <div className="helper">
              No seed phrase ever shared. You sign locally in MetaMask.
            </div>
          </div>

          {error && <div className="error-card">{error}</div>}
        </section>

        <section className="hero-panel">
          <div className="glass">
            <div className="panel-header">
              <div>
                <p className="panel-title">Wallet Session</p>
                <p className="panel-subtitle">{walletAddress ? status : "Awaiting connection"}</p>
              </div>
              <span className={status === "Authenticated" ? "badge live" : "badge idle"}>
                {status === "Authenticated" ? "Live" : "Idle"}
              </span>
            </div>

            {walletAddress ? (
              <div className="panel-body">
                <div className="row">
                  <span>Address</span>
                  <strong>{shortAddress}</strong>
                </div>
                <div className="row">
                  <span>Full Address</span>
                  <strong className="mono">{walletAddress}</strong>
                </div>
                <div className="row">
                  <span>Nonce</span>
                  <strong className="mono">{nonce || "Generating..."}</strong>
                </div>
              </div>
            ) : (
              <div className="panel-body">
                <ol className="steps">
                  <li>Click connect and approve in MetaMask.</li>
                  <li>Backend issues a unique nonce.</li>
                  <li>Sign to verify wallet ownership.</li>
                </ol>
                <div className="hint">You can use this session to access protected resources.</div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">Secure wallet authentication powered by MetaMask.</footer>
    </div>
  );
}

export default App;
