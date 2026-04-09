'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { revalidateCeoPage } from '@/app/erp/(protected)/ceo/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CeoAlert } from './ceo-types';

const SEVERITY = {
  critical: { border: '#E24B4A', bg: 'rgba(226, 75, 74, 0.08)' },
  warning: { border: '#BA7517', bg: 'rgba(186, 117, 23, 0.1)' },
  healthy: { border: '#1D9E75', bg: 'rgba(29, 158, 117, 0.08)' },
} as const;

const ORDER: Record<string, number> = { critical: 0, warning: 1, healthy: 2 };

function sortAlerts(list: CeoAlert[]) {
  return [...list].sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity] || a.title.localeCompare(b.title)
  );
}

function parseAlerts(data: unknown): CeoAlert[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (x): x is CeoAlert =>
      typeof x === 'object' &&
      x !== null &&
      'severity' in x &&
      'title' in x &&
      typeof (x as CeoAlert).title === 'string'
  ) as CeoAlert[];
}

type Props = {
  initialAlerts: unknown;
  errorMessage?: string | null;
};

export function AlertsEngine({ initialAlerts, errorMessage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const alerts = sortAlerts(parseAlerts(initialAlerts));

  async function refresh() {
    startTransition(async () => {
      await revalidateCeoPage();
      router.refresh();
    });
  }

  return (
    <Card className="border-primary/25 shadow-lg shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Strategic Alerts</CardTitle>
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">Last checked: just now</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void refresh()}
          >
            {pending ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No 2026 data found for this metric</p>
        ) : (
          alerts.map((a, i) => {
            const palette = SEVERITY[a.severity] ?? SEVERITY.warning;
            return (
              <div
                key={`${a.type}-${i}`}
                className="rounded-md border border-border/60 py-3 pl-4 pr-3"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: palette.border,
                  backgroundColor: palette.bg,
                }}
              >
                <div className="flex gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: palette.border }}
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold leading-snug text-foreground">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
