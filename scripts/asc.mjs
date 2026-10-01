// Calls the App Store Connect API with the team's API key, which only exists on m1.
// Run it through scripts/m1.sh, which pipes this file to node over SSH:
//
//   scripts/m1.sh asc GET '/v1/apps?filter[bundleId]=dev.schnau.stint'
//   scripts/m1.sh asc POST /v1/betaGroups '{"data": {...}}'
//
// Prints the JSON response; exits non-zero on HTTP errors.
import { sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const KEY_PATH = '/run/secrets/app-store-connect/api-key';
const KEY_ID = '85N8Y9CZC4';
const ISSUER_ID = 'e4b59e5f-0f40-4b1b-996e-b7a01664676a';

const [method = 'GET', path, body] = process.argv.slice(2);
if (!path) {
  console.error('usage: asc METHOD PATH [JSON]');
  process.exit(2);
}

const base64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

/** A short-lived ES256 token, as https://developer.apple.com/documentation/appstoreconnectapi describes. */
function token() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${base64url({
    iss: ISSUER_ID,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
  })}`;
  const signature = sign('sha256', Buffer.from(unsigned), { key: readFileSync(KEY_PATH), dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${signature.toString('base64url')}`;
}

const response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
  method,
  headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
  body,
});
const text = await response.text();
console.log(text ? JSON.stringify(JSON.parse(text), null, 2) : `${response.status} ${response.statusText}`);
if (!response.ok) process.exit(1);
