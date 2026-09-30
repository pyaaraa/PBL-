const AUTH_STORAGE_KEY = "attendance.walletAuth";

export function loadWalletAuth() {
  if (typeof window === "undefined") {
    return { token: "", walletAddress: "" };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: "", walletAddress: "" };
    return JSON.parse(raw);
  } catch {
    return { token: "", walletAddress: "" };
  }
}

export function saveWalletAuth(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function clearWalletAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
