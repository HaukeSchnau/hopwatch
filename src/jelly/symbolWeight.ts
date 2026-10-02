import type { SymbolViewProps, SymbolWeight } from 'expo-symbols';

/** The weight for an `Icon`: on iOS, the SF Symbol weight as given (Android: symbolWeight.android.ts). */
export const symbolWeight = (weight?: SymbolWeight): SymbolViewProps['weight'] => weight;
