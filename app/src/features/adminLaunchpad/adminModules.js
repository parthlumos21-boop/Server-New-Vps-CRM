import {
  FaBell,
  FaChartBar,
  FaCog,
  FaDesktop,
  FaListAlt,
  FaTh,
  FaUserCircle,
  FaThumbsUp,
  FaUserCog,
  FaUserTie,
  FaUsers
} from 'react-icons/fa'

export const adminModules = [
  {
    id: 'account-management',
    title: 'Account Management',
    route: '/admin/accounts',
    icon: FaUsers,
    accent: 'cyan',
    defaultEligible: true
  },
  {
    id: 'analytics-reports',
    title: 'Analytics Reports',
    route: '/admin/reports/custom',
    icon: FaChartBar,
    accent: 'navy',
    defaultEligible: true
  },
  {
    id: 'crm-administration',
    title: 'CRM Administration',
    route: '/admin/settings?tab=administration',
    icon: FaCog,
    accent: 'navy',
    defaultEligible: true
  },
  {
    id: 'customer-management',
    title: 'Customer Management',
    route: '/admin/customers/my-customers',
    icon: FaUserTie,
    accent: 'cyan',
    defaultEligible: true
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    route: '/admin/monitoring',
    icon: FaDesktop,
    accent: 'amber',
    defaultEligible: true
  },
  {
    id: 'deal-management',
    title: 'Deal Management',
    route: '/admin/deals',
    icon: FaThumbsUp,
    accent: 'cyan',
    defaultEligible: true
  },
  {
    id: 'my-work-status',
    title: 'My Work & Status',
    route: '/admin/my-work-status',
    icon: FaBell,
    accent: 'amber',
    defaultEligible: true
  },
  {
    id: 'reports',
    title: 'Custom Reports',
    route: '/admin/reports/custom',
    icon: FaListAlt,
    accent: 'cyan',
    defaultEligible: true
  },
  {
    id: 'my-profile',
    title: 'My Profile',
    route: '/admin/user-management',
    icon: FaUserCircle,
    accent: 'orange',
    defaultEligible: true
  },
  {
    id: 'user-management',
    title: 'User Management',
    route: '/admin/user-management',
    icon: FaUserCog,
    accent: 'navy',
    defaultEligible: true
  },
  {
    id: 'view-settings',
    title: 'View Settings',
    route: '/admin/settings',
    icon: FaTh,
    accent: 'cyan',
    defaultEligible: true
  }
]

export const getAdminModuleByRoute = (route) => (
  adminModules.find((module) => module.route === route) || null
)

export const adminDefaultModuleOptions = adminModules
  .filter((module) => module.defaultEligible)
  .map((module) => ({
    value: module.route,
    label: module.title
  }))
