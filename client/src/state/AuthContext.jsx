import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { apiFetch, authHeaders } from "../api";

const STORAGE_KEY = "dauth.auth";
const AuthContext = createContext(null);

function loadStoredAuth() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadStoredAuth());

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  async function login(role = "student", metadata = {}) {
    if (!window.ethereum) {
      throw new Error("MetaMask extension not detected. Please install MetaMask to continue.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const walletAddress = (await signer.getAddress()).toLowerCase();

    const challenge = await apiFetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, role, ...metadata }),
    });

    const signature = await signer.signMessage(challenge.messageToSign);
    const session = await apiFetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        role,
        nonce: challenge.nonce,
        signature,
        ...metadata,
      }),
    });

    setAuth(session);
    return session;
  }

  function logout() {
    setAuth(null);
  }

  const value = useMemo(
    () => ({
      auth,
      user: auth?.user || null,
      token: auth?.token || "",
      isAuthenticated: Boolean(auth?.token),
      authHeaders: authHeaders(auth?.token || ""),
      login,
      logout,
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
