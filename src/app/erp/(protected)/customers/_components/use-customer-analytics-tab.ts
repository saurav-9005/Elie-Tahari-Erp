'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CustomerAnalyticsTab } from '../_lib/customer-analytics';
import { isTimeoutLike, TIMEOUT_HELP } from '../_lib/customer-analytics';

export function useCustomerAnalyticsTab(tab: CustomerAnalyticsTab) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/erp/customer-analytics?tab=${tab}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (body as { error?: string }).error ?? res.statusText ?? 'Failed to load analytics';
          const err = Object.assign(new Error(msg), { status: res.status }) as Error & { status: number };
          throw err;
        }
        return body as { data?: unknown };
      })
      .then((body) => {
        if (cancelled) return;
        setData(body.data ?? null);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as Error & { status?: number };
        const msg = err?.message ?? 'Failed to load';
        const timeout = isTimeoutLike(msg, err.status);
        setError(timeout ? TIMEOUT_HELP : msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, tick]);

  const refetch = useCallback(() => {
    setError(null);
    setTick((t) => t + 1);
  }, []);

  return { data, loading, error, refetch };
}
