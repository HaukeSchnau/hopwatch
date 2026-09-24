import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { useHideSplash } from '@/shell/splash';

// Placeholder until the orbit direction is built.
export default function Home() {
  useHideSplash();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>orbit</Text>
      <Link href="/lab">Back to the Lab</Link>
    </View>
  );
}
