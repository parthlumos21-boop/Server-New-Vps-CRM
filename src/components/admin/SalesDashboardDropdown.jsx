import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronDown, FaChartLine, FaUsers, FaProjectDiagram, FaMoneyBillWave, FaBullseye, FaCrystalBall } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useClickOutside } from '../../hooks'
import './SalesDashboardDropdown.css'

const SalesDashboardDropdown = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useClickOutside(dropdownRef, () => setIsOpen(false))

  // Only show for admins
  if (user?.role !== 'admin') {
    return null
  }

  const dashboardOptions = [
    {
      id: 'sales-overview',
      label: 'Sales Overview',
      description: 'Main dashboard with sales metrics',
      icon: <FaChartLine />,
      route: '/admin/dashboard/sales-overview'
    },
    {
      id: 'team-performance',
      label: 'Team Performance',
      description: 'Sales team performance analytics',
      icon: <FaUsers />,
      route: '/admin/dashboard/team-performance'
    },
    {
      id: 'pipeline-analysis',
      label: 'Pipeline Analysis',
      description: 'Deal pipeline and conversion rates',
      icon: <FaProjectDiagram />,
      route: '/admin/dashboard/pipeline-analysis'
    },
    {
      id: 'revenue-tracking',
      label: 'Revenue Tracking',
      description: 'Monthly/quarterly revenue trends',
      icon: <FaMoneyBillWave />,
      route: '/admin/dashboard/revenue-tracking'
    },
    {
      id: 'target-progress',
      label: 'Target Progress',
      description: 'Achievement vs targets for team',
      icon: <FaBullseye />,
      route: '/admin/dashboard/target-progress'
    },
    {
      id: 'forecast-reports',
      label: 'Forecast Reports',
      description: 'Sales forecasting and predictions',
      icon: <FaCrystalBall />,
      route: '/admin/dashboard/forecast-reports'
    }
  ]

  const handleSelect = (route) => {
    navigate(route)
    setIsOpen(false)
  }

  return (
    <div className="sales-dashboard-dropdown" ref={dropdownRef}>
      <button
        className="sales-dashboard-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Sales Dashboard Options"
      >
        <FaChartLine className="sales-dashboard-icon" />
        <span>Sales Dashboard</span>
        <FaChevronDown className={`sales-dashboard-chevron ${isOpen ? 'active' : ''}`} />
      </button>

      {isOpen && (
        <div className="sales-dashboard-menu" role="menu">
          {dashboardOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="sales-dashboard-menu-item"
              onClick={() => handleSelect(option.route)}
              role="menuitem"
            >
              <span className="sales-dashboard-menu-icon">{option.icon}</span>
              <div className="sales-dashboard-menu-content">
                <span className="sales-dashboard-menu-label">{option.label}</span>
                <span className="sales-dashboard-menu-desc">{option.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SalesDashboardDropdown
