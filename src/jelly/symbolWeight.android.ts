import type { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import bold from 'expo-symbols/androidWeights/bold';

/**
 * The weight for an `Icon` on Android: always bold Material Symbols, to sit with the candy
 * type. Its own file, so iOS bundles don't carry the font.
 */
export const symbolWeight = (_weight?: SymbolWeight): SymbolViewProps['weight'] => ({ ios: 'unspecified', android: bold });
