import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthContext'

const AdminScreen = () => {
  const { user } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.body}>Signed in as {user?.name || user?.username}</Text>
      <Text style={styles.body}>Role: {user?.role}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 8,
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
})

export default AdminScreen
