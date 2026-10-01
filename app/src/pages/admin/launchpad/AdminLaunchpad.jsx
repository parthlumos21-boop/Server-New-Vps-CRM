import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FaHandshake, FaRocket, FaUserTie } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import Header from '../../../components/layout/Header'
import RightPanel from '../../../components/layout/RightPanel'
import {
  getAdminDefaultModuleRoute,
  setAdminDefaultModuleRoute
} from '../../../features/adminLaunchpad/adminLaunchpadStorage'
import { adminModules } from '../../../features/adminLaunchpad/adminModules'
import { buildAdminDealCustomViewUrl } from '../../../features/adminDeals/config/adminDealViews'
import { getAdminDealCustomViews, subscribeAdminDealCustomViews } from '../../../features/adminDeals/customViews/dealCustomViewStorage'
import swatiLogo from '../../../assets/swati-logo.png'
import './AdminLaunchpad.css'

const chunkModules = (modules, chunkSize) => (
  Array.from({ length: Math.ceil(modules.length / chunkSize) }, (_, index) => (
    modules.slice(index * chunkSize, index * chunkSize + chunkSize)
  ))
)

const isKevalVShah = (user = {}) => {
  const v = String(user?.name || user?.email || '').trim().toLowerCase()
  return v === 'keval v shah'
    || v.includes('keval v shah')
    || v === 'keval@swatiswitchgears.com'
}

const cardMotion = {
  hidden: { opacity: 0, y: 52, scale: 0.94, filter: 'blur(10px)' },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.95,
      delay: index * 0.16,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

const AdminLaunchpad = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isKeval = isKevalVShah(user)
  const [defaultRoute, setDefaultRoute] = useState(() => getAdminDefaultModuleRoute(user))
  const [dealCustomViews, setDealCustomViews] = useState(() => getAdminDealCustomViews())

  const launchpadModules = useMemo(() => ([
    ...adminModules,
    ...dealCustomViews
      .filter((view) => view.addToHomePage)
      .map((view) => ({
        id: `deal-custom-view-${view.id}`,
        title: view.name,
        route: buildAdminDealCustomViewUrl(view.id),
        icon: FaHandshake,
        accent: view.viewType === 'grid' ? 'amber' : 'cyan',
        defaultEligible: true,
      })),
  ]), [dealCustomViews])

  useEffect(() => subscribeAdminDealCustomViews(setDealCustomViews), [])

  const handleDefaultSelection = (route) => {
    setAdminDefaultModuleRoute(user, route)
    setDefaultRoute(route)
  }

  const defaultModuleLabel = useMemo(() => (
    launchpadModules.find((module) => module.route === defaultRoute)?.title || 'Not Set'
  ), [defaultRoute, launchpadModules])

  const featuredModules = useMemo(() => (
    launchpadModules.slice(0, 3)
  ), [launchpadModules])

  const remainingModuleRows = useMemo(() => (
    chunkModules(launchpadModules.slice(3), 4)
  ), [launchpadModules])

  return (
    <div className="lp-page">
      <Header isAdmin />

      <div className="lp-body">
        <main className="lp-main">
          
          <div className="lp-content lp-content--modules-only">
            <section className="lp-modules-shell">
              <div className="lp-modules-header">
                <div className="lp-modules-copy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <img src={swatiLogo} alt="Swati Logo" style={{ height: '120px', marginBottom: '24px' }} />
                  <span className="lp-modules-kicker">Admin Workspace</span>
                  <h1 className="lp-modules-title">LaunchPad</h1>
                  <p className="lp-modules-subtitle">
                    Open the next CRM workspace and choose which module should load first after login.
                  </p>
                </div>
                <div className="lp-modules-meta">
                  <div className="lp-modules-meta-item">
                    <span>Modules</span>
                    <strong>{launchpadModules.length}</strong>
                  </div>
                  <div className="lp-modules-meta-item">
                    <span>Default Module</span>
                    <strong>{defaultModuleLabel}</strong>
                  </div>
                </div>
              </div>

              <div className="lp-featured-grid">
                {featuredModules.map((module, moduleIndex) => {
                  const Icon = module.icon
                  const isDefault = defaultRoute === module.route

                  return (
                    <motion.div
                      key={module.id}
                      custom={moduleIndex}
                      variants={cardMotion}
                      initial="hidden"
                      animate="visible"
                      className={`lp-card lp-card--featured lp-card--${module.accent}`}
                    >
                      <button
                        type="button"
                        className={`lp-card-top lp-card-top--${module.accent}`}
                        onClick={() => navigate(module.route)}
                      >
                        <span className="lp-card-icon"><Icon /></span>
                        <span className={`lp-card-title${isKeval ? ' lp-card-title--full' : ''}`}>{module.title}</span>
                      </button>

                      <button
                        type="button"
                        className={`lp-card-footer${isDefault ? ' lp-card-footer--active' : ''}`}
                        onClick={() => handleDefaultSelection(module.route)}
                      >
                        Set As Default Module
                      </button>
                    </motion.div>
                  )
                })}
              </div>

              <div className="lp-module-rows">
                {remainingModuleRows.map((moduleRow, rowIndex) => (
                  <div key={`module-row-${rowIndex}`} className="lp-module-row">
                    {moduleRow.map((module, moduleIndex) => {
                      const Icon = module.icon
                      const isDefault = defaultRoute === module.route

                      return (
                        <motion.div
                          key={module.id}
                          custom={moduleIndex}
                          variants={cardMotion}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true, amount: 0.3 }}
                          className={`lp-card lp-card--${module.accent}`}
                        >
                          <button
                            type="button"
                            className={`lp-card-top lp-card-top--${module.accent}`}
                            onClick={() => navigate(module.route)}
                          >
                            <span className="lp-card-icon"><Icon /></span>
                            <span className={`lp-card-title${isKeval ? ' lp-card-title--full' : ''}`}>{module.title}</span>
                          </button>

                          <button
                            type="button"
                            className={`lp-card-footer${isDefault ? ' lp-card-footer--active' : ''}`}
                            onClick={() => handleDefaultSelection(module.route)}
                          >
                            Set As Default Module
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lp-expiry-bar">
            <span>Your CRM account has expired. Kindly process the payment.</span>
            {' '}
            <a href="#renew" className="lp-expiry-link">Renew CRM Account!</a>
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  )
}

export default AdminLaunchpad
