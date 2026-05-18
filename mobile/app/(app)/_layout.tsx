import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuButton from '../../src/components/MenuButton';
import { useTheme } from '../../src/context/ThemeContext';

// Clean SVG-style icon components using RN shapes
function IconHome({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* House shape */}
      <View style={{ width: size * 0.65, height: size * 0.55, backgroundColor: 'transparent', borderWidth: 2, borderColor: color, borderRadius: 3, position: 'absolute', bottom: 1 }} />
      <View style={{ width: 0, height: 0, borderLeftWidth: size * 0.5, borderRightWidth: size * 0.5, borderBottomWidth: size * 0.45, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, position: 'absolute', top: 0 }} />
    </View>
  );
}

function IconPlus({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.7, height: 2.5, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ width: 2.5, height: size * 0.7, backgroundColor: color, borderRadius: 2, position: 'absolute' }} />
    </View>
  );
}

function IconChart({ color, size = 22 }: { color: string; size?: number }) {
  const barW = size * 0.18;
  return (
    <View style={{ width: size, height: size, alignItems: 'flex-end', justifyContent: 'flex-end', flexDirection: 'row', gap: 3, paddingBottom: 1 }}>
      <View style={{ width: barW, height: size * 0.45, backgroundColor: color, borderRadius: 3, opacity: 0.6 }} />
      <View style={{ width: barW, height: size * 0.75, backgroundColor: color, borderRadius: 3 }} />
      <View style={{ width: barW, height: size * 0.55, backgroundColor: color, borderRadius: 3, opacity: 0.8 }} />
      <View style={{ width: barW, height: size * 0.9, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

function IconList({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', gap: 4 }}>
      {[0.55, 0.75, 0.45].map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
          <View style={{ width: size * w, height: 2, backgroundColor: color, borderRadius: 1, opacity: 0.8 }} />
        </View>
      ))}
    </View>
  );
}

export default function AppLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const c = colors;

  const tabBarHeight = 60 + (insets.bottom > 0 ? insets.bottom : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: c.bg },
        headerTitleStyle: { color: c.text, fontWeight: '700', fontSize: 17, letterSpacing: -0.3 },
        headerShadowVisible: false,
        headerRight: () => <MenuButton />,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.cardBorder,
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 8,
          height: tabBarHeight,
        },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.hint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 3, letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Головна',
          tabBarIcon: ({ color }) => <IconHome color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-transaction"
        options={{
          title: 'Додати',
          tabBarIcon: ({ color }) => <IconPlus color={color} />,
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Аналіз',
          tabBarIcon: ({ color }) => <IconChart color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Операції',
          tabBarIcon: ({ color }) => <IconList color={color} />,
        }}
      />
      {/* Hidden screens — navigated via menu */}
      <Tabs.Screen name="profile" options={{ href: null, title: 'Профіль' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Налаштування' }} />
    </Tabs>
  );
}
