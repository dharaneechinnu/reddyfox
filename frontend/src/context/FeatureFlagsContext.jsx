import { createContext, useContext } from 'react';
import useApi from '../hooks/useApi';
import { fetchFeatureFlags } from '../api';

const FeatureFlagsContext = createContext({});

// Module-scope so useApi doesn't refetch on every render.
const loadFeatureFlags = () => fetchFeatureFlags();

export function FeatureFlagsProvider({ children }) {
  const { data } = useApi(loadFeatureFlags, {});
  return <FeatureFlagsContext.Provider value={data}>{children}</FeatureFlagsContext.Provider>;
}

/**
 * Defaults to `true` (shown) while flags are still loading, or if `key`
 * is absent from the response — a flags-API hiccup or a deleted flag row
 * should never take a working feature offline. Only an explicit `false`
 * from the backend hides anything.
 */
export function useFeatureFlag(key) {
  const flags = useContext(FeatureFlagsContext);
  return flags[key] !== false;
}
