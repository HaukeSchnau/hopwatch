// The app's entry: Android's headless task for taps outside the app (src/widgets/headless.ts),
// then Expo Router, which renders the app.

import 'expo-router/entry';

import { AppRegistry } from 'react-native';

import { runSurfacesTask } from './src/widgets/headless';

AppRegistry.registerHeadlessTask('HopwatchSurfaces', () => runSurfacesTask);
