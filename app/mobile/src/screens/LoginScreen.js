import React, { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../auth/AuthContext'

const LoginScreen = () => {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async () => {
    setSubmitting(true)
    try {
      await login({ username, password, role })
    } catch (error) {
      Alert.alert('Login failed', error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CRM Login</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Email or username"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <View style={styles.roleRow}>
        {['user', 'admin'].map((nextRole) => (
          <TouchableOpacity
            key={nextRole}
            style={[styles.roleButton, role === nextRole && styles.roleButtonActive]}
            onPress={() => setRole(nextRole)}
          >
            <Text style={[styles.roleText, role === nextRole && styles.roleTextActive]}>{nextRole}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={submitting}>
        <Text style={styles.primaryText}>{submitting ? 'Signing in...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    color: '#1f3652',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#c8d6e6',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c8d6e6',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  roleButtonActive: {
    borderColor: '#2f6f9e',
    backgroundColor: '#eaf5fc',
  },
  roleText: {
    color: '#475569',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  roleTextActive: {
    color: '#1f5e8a',
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#2f6f9e',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '800',
  },
})

export default LoginScreen
