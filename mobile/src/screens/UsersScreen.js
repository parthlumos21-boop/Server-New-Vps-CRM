import React, { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { userApi } from '../api/userApi'
import { useAuth } from '../auth/AuthContext'

const UsersScreen = () => {
  const { tokens, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      setError('')
      try {
        const canManageUsers = user?.role === 'admin' || user?.role === 'super_admin'
        const result = canManageUsers
          ? await userApi.listUsers(tokens.accessToken)
          : await userApi.listDirectory(tokens.accessToken)
        setUsers(result.data || [])
      } catch (nextError) {
        setError(nextError.message)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [tokens.accessToken, user?.role])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users</Text>
      {loading && <ActivityIndicator />}
      {Boolean(error) && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name || item.username}</Text>
            <Text style={styles.meta}>{item.email || item.role}</Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    color: '#1f3652',
    fontSize: 24,
    fontWeight: '800',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4ee',
  },
  name: {
    color: '#1f3652',
    fontWeight: '800',
  },
  meta: {
    color: '#64748b',
    marginTop: 2,
  },
  error: {
    color: '#b91c1c',
    fontWeight: '700',
  },
})

export default UsersScreen
