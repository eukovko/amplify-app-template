import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import outputs from '../../../amplify_outputs.json';

type Client = ReturnType<typeof generateClient<Schema>>;
let client: Client | null = null;
let configured = false;

function ensureConfiguredSync(): void {
  if (configured) return;
  Amplify.configure(outputs);
  configured = true;
  client = generateClient<Schema>();
}

export async function ensureConfigured(): Promise<void> {
  ensureConfiguredSync();
}

export function getDataClient(): Client | null {
  ensureConfiguredSync();
  return client;
}
