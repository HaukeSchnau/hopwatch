import { expect, it } from 'vitest';

import { parseLink } from './links';

it("reads the Slack app link, without a client as going back to Hopwatch's app", () => {
  expect(parseLink('hopwatch://slack-app?client=123.456')).toEqual({ kind: 'slack-app', clientId: '123.456' });
  expect(parseLink('hopwatch://slack-app')).toEqual({ kind: 'slack-app', clientId: null });
});
