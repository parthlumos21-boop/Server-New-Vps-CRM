import React from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import AdminScreen from './src/screens/AdminScreen'
import LoginScreen from './src/screens/LoginScreen'
import LogoutScreen from './src/screens/LogoutScreen'
import UsersScreen from './src/screens/UsersScreen'

const ROUTES = {
  login: LoginScreen,
  logout: LogoutScreen,
  admin: AdminScreen,
  users: UsersScreen,
}

const AppShell = () => {
  const { loading, user, route, setRoute } = useAuth()
  const CurrentScreen = ROUTES[route] || LoginScreen

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading CRM...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.shell}>
      {user && (
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navButton} onPress={() => setRoute('admin')}>
            <Text style={styles.navText}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => setRoute('users')}>
            <Text style={styles.navText}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => setRoute('logout')}>
            <Text style={styles.navText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
      <CurrentScreen />
    </SafeAreaView>
  )
}

const App = () => (
  <AuthProvider>
    <AppShell />
  </AuthProvider>
)

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f6f8fb',
  },
  muted: {
    color: '#64748b',
  },
  nav: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4ee',
    backgroundColor: '#ffffff',
  },
  navButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c8d6e6',
    backgroundColor: '#f8fbff',
  },
  navText: {
    color: '#1f3652',
    fontWeight: '700',
  },
})

export default App
