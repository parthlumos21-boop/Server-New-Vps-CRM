import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaEye, FaSearch, FaThumbsUp, FaUserFriends, FaUsers,
} from 'react-icons/fa'
import './ViewSettingsPage.css'

const CARDS = [
  {
    id: 'my-accounts',
    title: 'My Accounts View',
    icon: FaUserFriends,
    iconColor: '#27ae60',
  },
  {
    id: 'my-customers',
    title: 'My Customers View',
    icon: FaUsers,
    iconColor: '#e67e22',
  },
  {
    id: 'view-deals',
    title: 'View Deals View',
    icon: FaThumbsUp,
    iconColor: '#2980b9',
  },
  {
    id: 'search-view',
    title: 'Search View Settings',
    icon: FaSearch,
    iconColor: '#27ae60',
  },
]

const ViewSettingsPage = ({ basePath = '/admin/view-settings' }) => {
  const navigate = useNavigate()

  return (
    <div className="vs-page">
      <div className="vs-topbar">
        <h1 className="vs-title">View Settings</h1>
      </div>

      <div className="vs-grid">
        {CARDS.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              type="button"
              className="vs-card"
              onClick={() => navigate(`${basePath}/${card.id}`)}
            >
              <div className="vs-card-header">
                <Icon className="vs-card-icon" style={{ color: card.iconColor }} />
                <span className="vs-card-title">{card.title}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ViewSettingsPage
