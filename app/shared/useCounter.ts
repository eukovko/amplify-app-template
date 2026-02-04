import { useCallback, useEffect, useState } from 'react';
import {
  decrementCounter,
  incrementCounter,
  subscribeToCounter,
} from './amplify/counterStore';

export function useCounter() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToCounter(
      (value) => {
        setCount(value);
        setLoading(false);
      },
      (e) => setError(e instanceof Error ? e.message : String(e))
    );
    return unsubscribe;
  }, []);

  const increment = useCallback(() => {
    setError(null);
    incrementCounter()
      .then(setCount)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const decrement = useCallback(() => {
    setError(null);
    decrementCounter()
      .then(setCount)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return { count, increment, decrement, loading, error };
}
