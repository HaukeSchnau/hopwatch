// A jelly that doesn't exist yet (the onboarding preview, a context being made, the
// settings mascot), shaped like the parts of a context a character reads.

import type { Hue } from '@/core';

export interface PreviewJelly {
  id: string;
  hue: Hue;
  glyph: string | null;
  name: string;
}
