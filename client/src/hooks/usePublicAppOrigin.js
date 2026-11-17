import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function browserOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function usePublicAppOrigin() {
  const [origin, setOrigin] = useState(browserOrigin);

  useEffect(() => {
    apiFetch("/public-url")
      .then(({ publicAppUrl }) => {
        if (publicAppUrl) setOrigin(publicAppUrl.replace(/\/$/, ""));
      })
      .catch(() => {
        // The current browser origin remains a safe fallback for deployed applications.
      });
  }, []);

  return origin;
}

export function verificationUrl(origin, query = "") {
  const base = (origin || browserOrigin()).replace(/\/$/, "");
  return `${base}/verify/${encodeURIComponent(query)}`;
}
