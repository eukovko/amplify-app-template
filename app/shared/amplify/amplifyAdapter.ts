import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '../../../amplify_outputs.json';
import type { Schema } from '../../../amplify/data/resource';

let configured = false;
let dataClient: ReturnType<typeof generateClient<Schema>> | null = null;

export async function ensureConfigured(): Promise<void> {
  if (configured) return;
  Amplify.configure(outputs);
  dataClient = generateClient<Schema>();
  configured = true;
}

export function getDataClient(): ReturnType<typeof generateClient<Schema>> {
  if (!dataClient) throw new Error('Amplify not configured');
  return dataClient;
}
