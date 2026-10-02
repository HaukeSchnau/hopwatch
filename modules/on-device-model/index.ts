// Apple's on-device language model as a progressive enhancement: everything here
// resolves quietly when the model isn't there (Android, iOS before 26, devices without
// Apple Intelligence, or while the model is still downloading).

import { requireOptionalNativeModule } from 'expo';

export type Availability =
  | 'available'
  | 'deviceNotEligible'
  | 'appleIntelligenceNotEnabled'
  | 'modelNotReady'
  | 'unsupported';

export interface Field {
  name: string;
  /** What the value means, for the model. */
  description: string;
  /** Constrains the answer to one of these strings. */
  choices?: readonly string[];
}

interface Native {
  availability(): Promise<Availability>;
  generate(options: { instructions: string; prompt: string; fields: Field[] }): Promise<Record<string, string>>;
}

const native = requireOptionalNativeModule<Native>('OnDeviceModel');

let failure: string | null = null;

/** Why the last `generate` returned null, for diagnostics. Null after a success. */
export function lastFailure(): string | null {
  return failure;
}

export async function availability(): Promise<Availability> {
  return native ? native.availability() : 'unsupported';
}

/** How long a request may take before callers fall back; a busy device can stall the model for minutes. */
const TIMEOUT_MS = 20_000;

/**
 * Asks the on-device model to fill `fields` for `prompt`. Resolves to null when the model
 * is unavailable, the request fails (e.g. a guardrail) or takes longer than 20 s, so
 * callers can fall back. A timed-out request still finishes natively; its answer is dropped.
 */
export async function generate<const F extends readonly Field[]>(request: {
  instructions: string;
  prompt: string;
  fields: F;
}): Promise<{ [K in F[number]['name']]: string } | null> {
  const state = native ? await native.availability() : 'unsupported';
  if (!native || state !== 'available') {
    failure = `model unavailable: ${state}`;
    return null;
  }
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer within ${TIMEOUT_MS / 1000} s`)), TIMEOUT_MS);
    });
    const answer = await Promise.race([native.generate({ ...request, fields: [...request.fields] }), timeout]).finally(() =>
      clearTimeout(timer),
    );
    // Trust the native schema, but verify at the boundary: every field present, choices kept.
    for (const field of request.fields) {
      const value = answer[field.name];
      if (typeof value !== 'string' || (field.choices && !field.choices.includes(value))) {
        failure = `answer didn't fit: ${field.name} = ${JSON.stringify(value)}`;
        return null;
      }
    }
    failure = null;
    return answer as { [K in F[number]['name']]: string };
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    if (__DEV__) console.warn('on-device model failed', error);
    return null;
  }
}
