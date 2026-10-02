// Node stand-in for @shopify/react-native-skia: the web JSI API over CanvasKit.
import CanvasKitInit from 'canvaskit-wasm/bin/canvaskit.js';
import { JsiSkApi } from '@shopify/react-native-skia/lib/module/skia/web/index.js';
const CanvasKit = await CanvasKitInit();
export const Skia = JsiSkApi(CanvasKit);
