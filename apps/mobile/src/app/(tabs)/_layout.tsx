import { type as typeScale } from '@koach/ui';
import { Tabs } from 'expo-router';
import { Feather, Sun } from 'phosphor-react-native';
import { useTheme } from '@/ui/useTheme';

// Phase 1 shows Today and You only; Revise and Library arrive in later phases (UI_SPEC §9).
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.leather,
        tabBarInactiveTintColor: c.inkMuted,
        tabBarStyle: { backgroundColor: c.linen, borderTopColor: c.hairline },
        tabBarLabelStyle: { ...typeScale.label, fontSize: 11, textTransform: 'uppercase' },
        sceneStyle: { backgroundColor: c.parchment },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <Sun color={focused ? c.leather : c.inkMuted} weight="light" size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ focused }) => (
            <Feather color={focused ? c.leather : c.inkMuted} weight="light" size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
