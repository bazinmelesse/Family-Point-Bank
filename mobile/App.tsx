import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ui';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { KidBoard } from './src/screens/KidBoard';
import { KidsScreen } from './src/screens/KidsScreen';
import { RewardsScreen } from './src/screens/RewardsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { WaysScreen } from './src/screens/WaysScreen';
import { StoreProvider, useStore } from './src/store';
import { useTheme } from './src/theme';

const TABS = [
  { id: 'kids', label: 'Kids', Screen: KidsScreen },
  { id: 'calendar', label: 'Calendar', Screen: CalendarScreen },
  { id: 'ways', label: 'Earn & lose', Screen: WaysScreen },
  { id: 'rewards', label: 'Rewards', Screen: RewardsScreen },
  { id: 'history', label: 'History', Screen: HistoryScreen },
  { id: 'settings', label: 'Settings', Screen: SettingsScreen },
] as const;

function Main() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, prefs, setPrefs } = useStore();

  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (prefs.kidMode) return <KidBoard onExit={() => setPrefs({ kidMode: false })} />;

  const tab = TABS.find((x) => x.id === prefs.tab) || TABS[0];
  const side = { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.line, paddingTop: insets.top + 10 }}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, side]}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: t.accentInk, fontWeight: '900' }}>★</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: t.ink, flex: 1 }} numberOfLines={1}>Family Point Bank</Text>
          <Pressable
            onPress={() => setPrefs({ kidMode: true })}
            accessibilityRole="button"
            style={{ borderWidth: 1, borderColor: t.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: t.surface }}
          >
            <Text style={{ color: t.ink, fontWeight: '700' }}>Kid view</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 4, paddingTop: 8 }, side]} accessibilityRole="tablist">
          {TABS.map((x) => {
            const on = x.id === tab.id;
            return (
              <Pressable
                key={x.id}
                onPress={() => setPrefs({ tab: x.id })}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: on ? t.accent : 'transparent' }}
              >
                <Text style={{ fontWeight: '700', fontSize: 15, color: on ? t.ink : t.muted }}>{x.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={[{ paddingTop: 20, paddingBottom: 60 + insets.bottom, width: '100%', maxWidth: 1100, alignSelf: 'center' }, side]} keyboardShouldPersistTaps="handled">
        <tab.Screen />
      </ScrollView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <Main />
          <StatusBar style="auto" />
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
