import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaChevronLeft,
  FaChevronUp,
  FaChevronDown,
  FaPencilAlt,
  FaCopy,
  FaTrash,
  FaCheckCircle,
  FaArrowRight,
} from 'react-icons/fa'
import {
  ACCOUNT_OWNER_LABELS,
  SW_BARODA_MUM_OWNER_LABELS,
} from '../../../features/accounts/config/accountDropdownOptions'
import './MyViewsPage.css'

const CATEGORIES = ['Accounts', 'Customers', 'SR', 'Deals']

const VIEWS_DATA = {
  Accounts: [
    {
      id: 'weekly-reports-all',
      title: 'Weekly reports-ALL',
      viewType: 'Tabular',
      conditions: [
        { type: 'check', text: 'Account Date is within last 7 day(s)' },
      ],
      fieldNames: [
        'Account Name', 'Account Date', 'Account Owner', 'Account Status',
        'Account Source', 'Account State', 'Contact Person', 'Phone',
        'Email', 'Latest Remark', 'Last Updated',
      ],
      filters: [
        { label: 'Account Category', values: ['SWATI'] },
      ],
    },
    {
      id: 'sw-baroda-mum',
      title: 'SW-Baroda / Mum',
      viewType: 'Tabular',
      conditions: [],
      fieldNames: [
        'Account Name', 'Account Date', 'Account Status', 'Account Source',
        'Account State', 'Contact Person', 'Project Name', 'Customer Type',
        'Product Category', 'Last Updated', 'Latest Remark',
      ],
      filters: [
        {
          label: 'Account Owner',
          values: SW_BARODA_MUM_OWNER_LABELS,
        },
      ],
    },
    {
      id: 'user-wise-leads',
      title: 'User Wise Leads',
      viewType: 'Tabular',
      conditions: [],
      fieldNames: [
        'Account Name', 'Account Date', 'Account Status',
        'Account Source', 'Product Category', 'Latest Remark',
      ],
      filters: [
        {
          label: 'Account Owner',
          values: ACCOUNT_OWNER_LABELS,
        },
      ],
    },
  ],
  Customers: [],
  SR: [],
  Deals: [],
}

const ViewCard = ({ view }) => {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mv-card">
      <div className="mv-card-header">
        <div className="mv-card-header-left">
          <button
            type="button"
            className="mv-toggle-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
          <span className="mv-card-title">{view.title}</span>
        </div>
        <div className="mv-card-header-right">
          <span className="mv-view-type">{view.viewType}</span>
          <span className="mv-hdr-divider">|</span>
          <button type="button" className="mv-icon-btn" title="Edit">
            <FaPencilAlt />
          </button>
          <button type="button" className="mv-icon-btn" title="Duplicate">
            <FaCopy />
          </button>
          <button type="button" className="mv-icon-btn mv-icon-btn--delete" title="Delete">
            <FaTrash />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mv-card-body">
          <div className="mv-conditions-col">
            <span className="mv-col-badge mv-col-badge--dark">Conditions</span>
            <div className="mv-conditions-list">
              {view.conditions.map((cond, i) => (
                <div key={i} className="mv-condition-item">
                  {cond.type === 'check' && (
                    <FaCheckCircle className="mv-cond-check" />
                  )}
                  <span>{cond.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mv-fields-col">
            <div className="mv-fields-row">
              <span className="mv-col-badge mv-col-badge--dark">Field Names</span>
              <FaArrowRight className="mv-arrow-icon" />
              <span className="mv-chain-text">
                {view.fieldNames.join(' › ')}
              </span>
            </div>

            {view.filters.map((filter, i) => (
              <div key={i} className="mv-filter-row">
                <span className="mv-col-badge mv-col-badge--orange">{filter.label}</span>
                <FaArrowRight className="mv-arrow-icon mv-arrow-icon--orange" />
                <span className="mv-chain-text">
                  {filter.values.join(' › ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const MyViewsPage = ({ basePath = '/admin/view-settings' }) => {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Accounts')
  const views = VIEWS_DATA[activeCategory] || []

  return (
    <div className="mv-page">
      <div className="mv-topbar">
        <button
          type="button"
          className="mv-back-btn"
          onClick={() => navigate(basePath)}
        >
          <FaChevronLeft />
          My Views
        </button>
        <button type="button" className="mv-add-btn">
          <FaCheckCircle className="mv-add-icon" />
          Add New View
        </button>
      </div>

      <div className="mv-body">
        <div className="mv-left-panel">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`mv-category${activeCategory === cat ? ' mv-category--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mv-content">
          {views.length === 0 ? (
            <div className="mv-empty">No views configured for {activeCategory}.</div>
          ) : (
            views.map((view) => <ViewCard key={view.id} view={view} />)
          )}
        </div>
      </div>
    </div>
  )
}

export default MyViewsPage
