import { request } from './client'

export const userApi = {
  listUsers(token) {
    return request('/users', { token })
  },

  listDirectory(token) {
    return request('/users/directory', { token })
  },
}
