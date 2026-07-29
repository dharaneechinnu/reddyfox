import { useState, useEffect } from 'react';

/**
 * Runs an async fetcher once on mount and tracks loading/error state.
 * Keeps the fetch/loading/error boilerplate out of every page component.
 *
 * `fetcher` must be a stable reference (defined at module scope, or wrapped
 * in useCallback) — otherwise this refetches on every render.
 */
export default function useApi(fetcher, fallback = null) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [fetcher]);

  return { data, loading, error };
}
