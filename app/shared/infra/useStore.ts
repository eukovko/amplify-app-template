import { useEffect, useState } from 'react';
import { ensureConfigured, getDataClient } from '../amplify/amplifyAdapter';

export function useStore() {
  const [client, setClient] = useState<ReturnType<typeof getDataClient> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    ensureConfigured().then(() => {
      if (!cancelled) setClient(getDataClient());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { client, ready: client !== null };
}
