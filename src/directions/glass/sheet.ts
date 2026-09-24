// Sheet presentation shared by every Glass detail view: native form sheets with a
// grabber and a transparent background, so iOS draws its own glass sheet material.

/** Stack screen options for a form sheet resting at `detents` (fractions of the screen). */
export const sheetOptions = (detents: number[]) => ({
  presentation: 'formSheet' as const,
  sheetAllowedDetents: detents,
  sheetGrabberVisible: true,
  contentStyle: { backgroundColor: 'transparent' },
});
