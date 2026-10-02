import { describe, expect, it } from 'vitest';

import { pickLanguage } from '.';

describe('pickLanguage', () => {
  it('takes the first preferred language Hopwatch speaks', () => {
    expect(pickLanguage(['fr-FR', 'de-DE', 'en'])).toBe('de');
    expect(pickLanguage(['en_DE', 'de'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(pickLanguage(['ja-JP'])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });
});
