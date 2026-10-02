import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/common/ErrorBoundary'
import './styles/index.css'
import './styles/user-modern.css'

const enforceColumnFilterText = () => {
  document.querySelectorAll('input.crm-column-filter-input').forEach((input) => {
    input.style.setProperty('color', '#000000', 'important')
    input.style.setProperty('-webkit-text-fill-color', '#000000', 'important')
    input.style.setProperty('caret-color', '#000000', 'important')
    input.style.setProperty('font-weight', '400', 'important')
    input.style.setProperty('background-color', '#ffffff', 'important')
    input.style.setProperty('opacity', '1', 'important')
    input.style.setProperty('visibility', 'visible', 'important')
  })
}

enforceColumnFilterText()
new MutationObserver(enforceColumnFilterText).observe(document.documentElement, {
  subtree: true,
  childList: true,
})

const STALE_BUILD_RELOAD_KEY = 'crm_stale_build_reload'
const isStaleBuildError = (error) => {
  const message = String(error?.message || error || '')
  return message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('Loading chunk')
}

const reloadForFreshBuild = () => {
  if (sessionStorage.getItem(STALE_BUILD_RELOAD_KEY) === '1') return
  sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, '1')
  window.location.reload()
}

window.addEventListener('unhandledrejection', (event) => {
  if (isStaleBuildError(event.reason)) {
    event.preventDefault()
    reloadForFreshBuild()
  }
})

window.addEventListener('error', (event) => {
  if (isStaleBuildError(event.error || event.message)) {
    event.preventDefault()
    reloadForFreshBuild()
  }
})

window.addEventListener('load', () => {
  sessionStorage.removeItem(STALE_BUILD_RELOAD_KEY)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
