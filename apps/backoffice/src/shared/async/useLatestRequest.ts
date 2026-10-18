'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@pharmacy/http';

export function useLatestRequest<T>(load: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]): {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload(): void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const generation = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(() => {
    controllerRef.current?.abort();
    const current = ++generation.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    loadRef.current(controller.signal).then(
      (value) => {
        if (current !== generation.current) return;
        setData(value);
        setLoading(false);
      },
      (cause) => {
        if (current !== generation.current) return;
        setError(cause instanceof ApiError ? cause : new ApiError('network'));
        setLoading(false);
      },
    );
  }, deps);

  useEffect(() => {
    reload();
    return () => controllerRef.current?.abort();
  }, [reload]);

  return { data, loading, error, reload };
}
