import * as SecureStore from 'expo-secure-store'

const ACCESS_TOKEN_KEY = 'crm_mobile_access_token'
const REFRESH_TOKEN_KEY = 'crm_mobile_refresh_token'

export const saveTokens = async ({ accessToken = '', refreshToken = '' } = {}) => {
  if (accessToken) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken)
  }
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export const getTokens = async () => ({
  accessToken: await SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  refreshToken: await SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
})

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
}
