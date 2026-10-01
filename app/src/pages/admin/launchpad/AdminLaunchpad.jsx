import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FaCheck, FaHandshake, FaRocket, FaUserTie } from 'react-icons/fa'
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
import lumosLogo from '../../../assets/lumos-logo.svg'
import './AdminLaunchpad.css'

const LUMOS_ONLY_USERS = [
  "sahana prasenjit",
  "kuldeep nayi",
  "manish patel",
  "vishal vandra",
  "amiha purohit",
  "vihal memaria",
  "jaydip chavda",
  "dhara",
  "demo"
]

const getMonitoringCardLogos = (user) => {
  const username = String(user?.name || user?.email || '').trim().toLowerCase()
  
  if (username === 'keval v shah' || username === 'keval@swatiswitchgears.com') {
    return { showSwati: true, showLumos: false }
  }
  
  if (
    LUMOS_ONLY_USERS.includes(username) || 
    username.includes('@lumossolution.com') ||
    username.includes('@gmail.com')
  ) {
    return { showSwati: false, showLumos: true }
  }

  return { showSwati: true, showLumos: false }
}

const isKevalVShah = (user = {}) => {
  const v = String(user?.name || user?.email || '').trim().toLowerCase()
  return v === 'keval v shah'
    || v.includes('keval v shah')
    || v === 'keval@swatiswitchgears.com'
}

const cardMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      delay: Math.min(index * 0.03, 0.18),
      ease: [0.25, 1, 0.5, 1],
    },
  }),
}

const AdminLaunchpad = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isKeval = isKevalVShah(user)
  const { showSwati, showLumos } = getMonitoringCardLogos(user)
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
    setDefaultRoute(route)
    setAdminDefaultModuleRoute(user, route)
  }

  const defaultModuleLabel = useMemo(() => (
    launchpadModules.find((module) => module.route === defaultRoute)?.title || 'Not Set'
  ), [defaultRoute, launchpadModules])

  return (
    <div className="lp-page">
      <Header isAdmin />

      <div className="lp-body">
        <main className="lp-main">
          <div className="lp-content lp-content--modules-only">
            <section className="lp-modules-shell">
              <div className="lp-modules-header">
                <div className="lp-modules-copy">
                  {showSwati && (
                    <img src={swatiLogo} alt="Swati Logo" className="lp-header-logo" />
                  )}
                  {showLumos && (
                    <img src={lumosLogo} alt="Lumos Logo" className="lp-header-logo" />
                  )}
                  <div className="lp-modules-text-block">
                    <span className="lp-modules-kicker">Admin Workspace</span>
                    <h1 className="lp-modules-title">LaunchPad</h1>
                    <p className="lp-modules-subtitle">
                      Open the next CRM workspace and choose which module should load first after login.
                    </p>
                  </div>
                </div>

                <div className="lp-modules-meta">
                  <div className="lp-modules-meta-item">
                    <span className="lp-meta-label">Modules</span>
                    <strong className="lp-meta-value">{launchpadModules.length}</strong>
                  </div>
                  <div className="lp-modules-meta-item">
                    <span className="lp-meta-label">Default Module</span>
                    <strong className="lp-meta-value">{defaultModuleLabel}</strong>
                  </div>
                </div>
              </div>

              <div className="lp-unified-grid">
                {launchpadModules.map((module, moduleIndex) => {
                  const Icon = module.icon
                  const isDefault = defaultRoute === module.route

                  return (
                    <motion.div
                      key={module.id}
                      custom={moduleIndex}
                      variants={cardMotion}
                      initial="hidden"
                      animate="visible"
                      className={`lp-card lp-card--${module.accent}${isDefault ? ' lp-card--default-active' : ''}`}
                    >
                      <button
                        type="button"
                        className={`lp-card-top lp-card-top--${module.accent}`}
                        onClick={() => navigate(module.route)}
                        title={`Open ${module.title}`}
                      >
                        <span className="lp-card-icon"><Icon /></span>
                        <span className={`lp-card-title${isKeval ? ' lp-card-title--full' : ''}`}>{module.title}</span>
                      </button>

                      <button
                        type="button"
                        className={`lp-card-footer${isDefault ? ' lp-card-footer--active' : ''}`}
                        onClick={() => handleDefaultSelection(module.route)}
                        title={isDefault ? 'Current Default Module' : `Set ${module.title} as Default`}
                      >
                        {isDefault ? (
                          <>
                            <FaCheck className="lp-card-footer-icon" />
                            <span>Default Module</span>
                          </>
                        ) : (
                          <span>Set As Default Module</span>
                        )}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          </div>
        </main>

        <RightPanel />
      </div>
    </div>
  )
}

export default AdminLaunchpad
