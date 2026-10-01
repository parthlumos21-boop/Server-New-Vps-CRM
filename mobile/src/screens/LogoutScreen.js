import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../auth/AuthContext'

const LogoutScreen = () => {
  const { logout, user } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logout</Text>
      <Text style={styles.body}>End the session for {user?.name || user?.username}.</Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: '#1f3652',
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    color: '#475569',
    fontSize: 16,
  },
  button: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#b91c1c',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
})

export default LogoutScreen
