import { ensureConfigured, getDataClient } from './amplifyStorageAdapter';

const COUNTER_KEY = 'counter';

function parseValue(value: string | null | undefined): number {
  if (value == null) return 0;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function subscribeToCounter(
  callback: (value: number) => void,
  onError?: (error: Error) => void
): () => void {
  const c = getDataClient();
  if (!c) {
    callback(0);
    return () => {};
  }
  const sub = c.models.AppStorage.observeQuery({
    filter: { key: { eq: COUNTER_KEY } },
  }).subscribe({
    next: ({ items }) => {
      const item = items[0];
      callback(item ? parseValue(item.value) : 0);
    },
    error: (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    },
  });
  return () => sub.unsubscribe();
}

export async function getCounter(): Promise<number> {
  await ensureConfigured();
  const c = getDataClient();
  if (!c) return 0;
  const { data, errors } = await c.models.AppStorage.get({
    key: COUNTER_KEY,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join(', '));
  }
  return parseValue(data?.value);
}

export async function setCounter(value: number): Promise<void> {
  await ensureConfigured();
  const c = getDataClient();
  if (!c) return;
  const valueStr = String(value);
  const { data: existing } = await c.models.AppStorage.get({
    key: COUNTER_KEY,
  });
  if (existing) {
    const { errors } = await c.models.AppStorage.update({
      key: COUNTER_KEY,
      value: valueStr,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
  } else {
    const { errors } = await c.models.AppStorage.create({
      key: COUNTER_KEY,
      value: valueStr,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
  }
}

export async function incrementCounter(): Promise<number> {
  const current = await getCounter();
  const next = current + 1;
  await setCounter(next);
  return next;
}

export async function decrementCounter(): Promise<number> {
  const current = await getCounter();
  const next = current - 1;
  await setCounter(next);
  return next;
}
