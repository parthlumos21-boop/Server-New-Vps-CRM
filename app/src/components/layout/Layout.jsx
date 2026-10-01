import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { motion } from 'framer-motion'
import Header from './Header'
import Sidebar from './Sidebar'
import RightPanel from './RightPanel'
import './Layout.css'

const shellMotion = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
}

const Layout = ({ isAdmin = false }) => {
  const location = useLocation()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    setMobileSidebarOpen(false)
    document.documentElement.setAttribute('data-theme', theme)
    if (isAdmin) {
      document.documentElement.classList.add('is-admin')
      document.documentElement.classList.remove('is-user')
    } else {
      document.documentElement.classList.add('is-user')
      document.documentElement.classList.remove('is-admin')
    }
  }, [location.pathname, location.search, theme, isAdmin])

  return (
    <div className={`layout ${isAdmin ? 'layout--admin' : 'layout--user'}`}>
      <div className="layout-aura layout-aura--one" aria-hidden="true" />
      <div className="layout-aura layout-aura--two" aria-hidden="true" />
      <div className="layout-aura layout-aura--three" aria-hidden="true" />
      <Header
        isAdmin={isAdmin}
        isSidebarOpen={mobileSidebarOpen}
        onToggleSidebar={() => setMobileSidebarOpen((currentValue) => !currentValue)}
      />

      <div className="layout-body">
        <motion.div
          className={`layout-column layout-column--sidebar${mobileSidebarOpen ? ' layout-column--sidebar-open' : ''}`}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={shellMotion}
        >
          <Sidebar isAdmin={isAdmin} />
        </motion.div>

        {mobileSidebarOpen ? (
          <button
            type="button"
            className="layout-sidebar-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <div className="layout-stage">
          <motion.div
            className="layout-main-shell"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...shellMotion, delay: 0.08 }}
          >
            <main className="layout-main">
              <div className="layout-main-grid" aria-hidden="true" />
              <div className="layout-main-beacon layout-main-beacon--one" aria-hidden="true" />
              <div className="layout-main-beacon layout-main-beacon--two" aria-hidden="true" />

              <div className="layout-main-inner">
                <div className="layout-content-frame">
                  <Outlet />
                </div>
              </div>
            </main>
          </motion.div>
        </div>

        {isAdmin && (
          <motion.div
            className="layout-column layout-column--right"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...shellMotion, delay: 0.1 }}
          >
            <RightPanel />
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Layout
