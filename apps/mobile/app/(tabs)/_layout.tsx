import { Tabs } from 'expo-router'
import { Platform, View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import { Colors, Typography, Spacing } from '@/theme'

interface TabIconProps {
  icon: string
  label: string
  focused: boolean
}

function TabIcon({ icon, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60 + insets.bottom,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#1a0533',
          borderTopColor: 'rgba(139,92,246,0.25)',
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarBackground: Platform.OS === 'ios'
          ? () => (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
        tabBarActiveTintColor: Colors.primary[400],
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Inicio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" label="Calendario" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.logTabWrapper}>
              <View style={[styles.logTabBtn, focused && styles.logTabBtnFocused]}>
                <Text style={styles.logTabIcon}>✚</Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🌸" label="Jardín" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" label="Stats" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', gap: 2, paddingTop: Spacing.xs },
  tabIcon: { fontSize: 22, opacity: 0.5 },
  tabIconFocused: { opacity: 1 },
  tabLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: Typography.fontFamily.medium },
  tabLabelFocused: { color: Colors.lavender[300] },
  tabDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: Colors.primary[400], marginTop: 2,
  },
  logTabWrapper: { alignItems: 'center', justifyContent: 'center' },
  logTabBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(139,92,246,0.5)',
    marginTop: -8,
  },
  logTabBtnFocused: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[400],
  },
  logTabIcon: { fontSize: 22, color: '#fff' },
})
