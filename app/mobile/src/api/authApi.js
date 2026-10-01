import { request } from './client'

export const authApi = {
  login({ username, password, role = 'user', rememberMe = true }) {
    return request('/auth/login', {
      method: 'POST',
      body: {
        username,
        password,
        role,
        rememberMe,
        clientType: 'mobile',
        includeToken: true,
      },
    })
  },

  me(token) {
    return request('/auth/me', { token })
  },

  refresh(refreshToken) {
    return request('/auth/refresh', {
      method: 'POST',
      body: {
        refreshToken,
        clientType: 'mobile',
        includeToken: true,
      },
    })
  },

  logout({ token, refreshToken }) {
    return request('/auth/logout', {
      method: 'POST',
      token,
      body: { refreshToken },
    })
  },
}
