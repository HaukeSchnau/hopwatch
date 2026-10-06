// Pushes the App Store listing to App Store Connect: the copy and settings in store/app-store/
// (fastlane's layout, see store/README.md) and the framed screenshots in
// store/screenshots/app-store/<locale>/. Rerunnable: it overwrites what's there, and only
// replaces a locale's screenshots when the files changed.
//
//   node scripts/app-store.mjs                everything
//   node scripts/app-store.mjs text           copy, URLs, version, copyright, categories,
//                                             age rating, review details
//   node scripts/app-store.mjs screenshots    screenshots only
//   ... --app 6818526671                      another app than the one with app.json's bundle ID
//
// It works on the version being prepared (or creates one for app.json's version) and never
// submits anything. API calls go through the `asc` CLI (`asc api`, signed in to Urbs UG);
// screenshot bytes go from here straight to Apple's upload URLs. Pricing, availability and
// App Privacy are set once and aren't handled here.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const store = join(root, 'store/app-store');
const frames = join(root, 'store/screenshots/app-store');
/** The 6.9" iPhone slot (1320 x 2868), the only size required for an iPhone-only app. */
const DISPLAY_TYPE = 'APP_IPHONE_67';
/** Version states in which the listing can still be edited. */
const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];

const args = process.argv.slice(2);
const appFlag = args.indexOf('--app');
const appArg = appFlag >= 0 ? args.splice(appFlag, 2)[1] : null;
const only = args[0] ?? 'all';
if (!['all', 'text', 'screenshots'].includes(only)) {
  console.error('usage: node scripts/app-store.mjs [text|screenshots] [--app ID]');
  process.exit(2);
}

/** One App Store Connect API call through `asc api`. Returns the parsed JSON (null for 204s). */
function asc(method, path, body) {
  const writes = method === 'GET' ? [] : ['--confirm', ...(body ? ['--body', JSON.stringify(body)] : [])];
  let out;
  try {
    // asc prints Apple's error on stderr, which goes straight to the terminal.
    out = execFileSync('asc', ['api', method, path, ...writes], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  } catch {
    throw new Error(`${method} ${path} failed`);
  }
  return out.trim().startsWith('{') ? JSON.parse(out) : null;
}

const data = (type, id, attributes, relationships) => ({ data: { type, ...(id ? { id } : {}), ...(attributes ? { attributes } : {}), ...(relationships ? { relationships } : {}) } });
const rel = (type, id) => ({ data: { type, id } });

/** A field file's text without the trailing newline, or undefined when there's no file. */
function field(...parts) {
  const file = join(store, ...parts);
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : undefined;
}

const locales = readdirSync(store, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^[a-z]{2}-[A-Z]{2}$/.test(entry.name))
  .map((entry) => entry.name);

const appJson = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const appId = appArg ?? asc('GET', `/v1/apps?filter[bundleId]=${appJson.ios.bundleIdentifier}`).data[0]?.id;
if (!appId) throw new Error(`No App Store Connect app for ${appJson.ios.bundleIdentifier}; pass --app ID`);
console.log(`app ${appId}`);

/** The version being prepared; creates one for app.json's version if there is none. */
function editableVersion() {
  const versions = asc('GET', `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=50`).data;
  const editable = versions.find((v) => EDITABLE.includes(v.attributes.appVersionState));
  if (editable) return { version: editable, firstRelease: versions.length === 1 };
  const created = asc('POST', '/v1/appStoreVersions', data('appStoreVersions', null, { platform: 'IOS', versionString: appJson.version }, { app: rel('apps', appId) })).data;
  return { version: created, firstRelease: false };
}

const { version, firstRelease } = editableVersion();
console.log(`version ${version.attributes.versionString} (${version.id})`);
const versionLocalizations = () =>
  new Map(asc('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`).data.map((l) => [l.attributes.locale, l.id]));

function pushText() {
  // The listing's version follows app.json, so the release matches the build.
  asc('PATCH', `/v1/appStoreVersions/${version.id}`, data('appStoreVersions', version.id, { versionString: appJson.version, copyright: field('copyright.txt') }));
  // Hopwatch shows nothing it doesn't own: no third-party content.
  asc('PATCH', `/v1/apps/${appId}`, data('apps', appId, { contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT' }));

  const existing = versionLocalizations();
  for (const locale of locales) {
    const attributes = {
      description: field(locale, 'description.txt'),
      keywords: field(locale, 'keywords.txt'),
      promotionalText: field(locale, 'promotional_text.txt'),
      marketingUrl: field(locale, 'marketing_url.txt'),
      supportUrl: field(locale, 'support_url.txt'),
      // App Store Connect only takes "What's New" from the second version on.
      ...(firstRelease ? {} : { whatsNew: field(locale, 'release_notes.txt') }),
    };
    const id = existing.get(locale);
    if (id) asc('PATCH', `/v1/appStoreVersionLocalizations/${id}`, data('appStoreVersionLocalizations', id, attributes));
    else asc('POST', '/v1/appStoreVersionLocalizations', data('appStoreVersionLocalizations', null, { locale, ...attributes }, { appStoreVersion: rel('appStoreVersions', version.id) }));
    console.log(`${locale}: version texts`);
  }

  // The app info being edited alongside the version (a live app also has a read-only one).
  const infos = asc('GET', `/v1/apps/${appId}/appInfos`).data;
  const info = infos.find((i) => i.attributes.state !== 'READY_FOR_DISTRIBUTION') ?? infos[0];
  const category = (file) => {
    const id = field(file);
    return { data: id ? { type: 'appCategories', id } : null };
  };
  asc('PATCH', `/v1/appInfos/${info.id}`, {
    data: { type: 'appInfos', id: info.id, relationships: { primaryCategory: category('primary_category.txt'), secondaryCategory: category('secondary_category.txt') } },
  });

  const infoLocalizations = new Map(asc('GET', `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`).data.map((l) => [l.attributes.locale, l.id]));
  for (const locale of locales) {
    // A name someone else uses answers 409.
    const attributes = { name: field(locale, 'name.txt'), subtitle: field(locale, 'subtitle.txt'), privacyPolicyUrl: field(locale, 'privacy_url.txt') };
    const id = infoLocalizations.get(locale);
    if (id) asc('PATCH', `/v1/appInfoLocalizations/${id}`, data('appInfoLocalizations', id, attributes));
    else asc('POST', '/v1/appInfoLocalizations', data('appInfoLocalizations', null, { locale, ...attributes }, { appInfo: rel('appInfos', info.id) }));
    console.log(`${locale}: name and subtitle`);
  }

  const rating = asc('GET', `/v1/appInfos/${info.id}/ageRatingDeclaration`).data;
  asc('PATCH', `/v1/ageRatingDeclarations/${rating.id}`, data('ageRatingDeclarations', rating.id, JSON.parse(field('age_rating.json'))));
  console.log('age rating');

  const demoUser = field('review_information', 'demo_user.txt');
  const review = {
    contactFirstName: field('review_information', 'first_name.txt'),
    contactLastName: field('review_information', 'last_name.txt'),
    contactPhone: field('review_information', 'phone_number.txt'),
    contactEmail: field('review_information', 'email_address.txt'),
    demoAccountRequired: Boolean(demoUser),
    demoAccountName: demoUser ?? null,
    demoAccountPassword: field('review_information', 'demo_password.txt') ?? null,
    notes: field('review_information', 'notes.txt'),
  };
  const detail = asc('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)?.data;
  if (detail) asc('PATCH', `/v1/appStoreReviewDetails/${detail.id}`, data('appStoreReviewDetails', detail.id, review));
  else asc('POST', '/v1/appStoreReviewDetails', data('appStoreReviewDetails', null, review, { appStoreVersion: rel('appStoreVersions', version.id) }));
  console.log('review details');
}

const md5 = (bytes) => createHash('md5').update(bytes).digest('hex');

/** Uploads one screenshot into `setId` along Apple's upload operations and commits it. */
async function upload(setId, file) {
  const bytes = readFileSync(file);
  const fileName = file.split('/').pop();
  const reserved = asc('POST', '/v1/appScreenshots', data('appScreenshots', null, { fileName, fileSize: bytes.length }, { appScreenshotSet: rel('appScreenshotSets', setId) })).data;
  for (const op of reserved.attributes.uploadOperations) {
    const response = await fetch(op.url, {
      method: op.method,
      headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])),
      body: bytes.subarray(op.offset, op.offset + op.length),
    });
    if (!response.ok) throw new Error(`upload of ${fileName} failed: ${response.status} ${await response.text()}`);
  }
  asc('PATCH', `/v1/appScreenshots/${reserved.id}`, data('appScreenshots', reserved.id, { uploaded: true, sourceFileChecksum: md5(bytes) }));
  return reserved.id;
}

async function pushScreenshots() {
  const localizations = versionLocalizations();
  for (const locale of readdirSync(frames).sort()) {
    const files = readdirSync(join(frames, locale))
      .filter((name) => name.endsWith('.png'))
      .sort()
      .map((name) => join(frames, locale, name));
    const localizationId = localizations.get(locale);
    if (!localizationId) throw new Error(`${locale} has no version localization yet; run the text step first`);

    const sets = asc('GET', `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`).data;
    const setId =
      sets.find((s) => s.attributes.screenshotDisplayType === DISPLAY_TYPE)?.id ??
      asc('POST', '/v1/appScreenshotSets', data('appScreenshotSets', null, { screenshotDisplayType: DISPLAY_TYPE }, { appStoreVersionLocalization: rel('appStoreVersionLocalizations', localizationId) })).data.id;

    const existing = asc('GET', `/v1/appScreenshotSets/${setId}/appScreenshots?limit=10`).data;
    const same =
      existing.length === files.length &&
      existing.every((s, i) => s.attributes.sourceFileChecksum === md5(readFileSync(files[i])) && s.attributes.assetDeliveryState?.state === 'COMPLETE');
    if (same) {
      console.log(`${locale}: screenshots unchanged`);
      continue;
    }
    for (const shot of existing) asc('DELETE', `/v1/appScreenshots/${shot.id}`);
    const ids = [];
    for (const file of files) ids.push(await upload(setId, file));
    asc('PATCH', `/v1/appScreenshotSets/${setId}/relationships/appScreenshots`, { data: ids.map((id) => ({ type: 'appScreenshots', id })) });

    // Apple processes uploads asynchronously; wait until every one is in or has failed.
    for (let attempt = 0; ; attempt++) {
      const states = asc('GET', `/v1/appScreenshotSets/${setId}/appScreenshots?limit=10`).data.map((s) => s.attributes.assetDeliveryState);
      const failed = states.filter((s) => s?.state === 'FAILED');
      if (failed.length) throw new Error(`${locale}: screenshot processing failed: ${JSON.stringify(failed)}`);
      if (states.every((s) => s?.state === 'COMPLETE')) break;
      if (attempt >= 30) throw new Error(`${locale}: screenshots still processing after 5 minutes`);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    console.log(`${locale}: ${files.length} screenshots uploaded`);
  }
}

if (only !== 'screenshots') pushText();
if (only !== 'text') await pushScreenshots();
