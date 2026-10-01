const state = {
  databaseReady: false,
  schemaReady: false,
  lastError: '',
  lastCheckedAt: null,
}

const updateRuntimeState = (updates = {}) => {
  Object.assign(state, updates, {
    lastCheckedAt: new Date().toISOString(),
  })
}

const getRuntimeState = () => ({
  ...state,
})

const isBackendReady = () => state.databaseReady && state.schemaReady

module.exports = {
  updateRuntimeState,
  getRuntimeState,
  isBackendReady,
}

