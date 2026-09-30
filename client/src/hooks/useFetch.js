import { useCallback, useEffect, useState } from "react";

export function useFetch(fetcher, deps = [], options = {}) {
  const { immediate = true } = options;
  const depsKey = JSON.stringify(deps);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetcher();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || "Request failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) {
      run().catch(() => {});
    }
  }, [depsKey, immediate, run]);

  return { data, loading, error, run };
}
