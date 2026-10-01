import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronLeft, FaGripVertical, FaTimes } from 'react-icons/fa'
import './SearchViewSettingsPage.css'

/* ── Context definitions ────────────────────────────────── */
const CONTEXTS = ['Accounts', 'Customers', 'Deals', 'SR', 'Closed-SR']

const CONTEXT_DATA = {
  Accounts: {
    leftTitle: 'Account Attributes',
    fields: [
      'Account Name', 'Account Date', 'Account Category', 'Account Owner',
      'Account Status', 'Account Source', 'Account State', 'Contact Person',
      'Phone', 'Email', 'Alternate Phone', 'Alternate Email', 'Customer Type',
      'Project Name', 'Product Category', 'Size', 'State', 'Location',
      'Description', 'Industry type', 'Inquiry Ref No.', 'Address',
      'Inquiry Ref Date', 'Consultant Name', 'PO Value',
      'Status of Customer as per Order Received',
      'Status Of Customer as per quotation Given',
      'GSTIN', 'State Code', 'Job No', 'Reason For Lost', 'Customer Name',
      'Account Subsource', 'Added By', 'Added On', 'Last Updated',
      'Latest Remark', 'User Group',
    ],
    defaultSelected: [
      'Account Date', 'Account Name', 'Account Owner', 'Account Status',
      'Account State', 'Account Source', 'Contact Person', 'Phone',
      'Email', 'Added By', 'Latest Remark',
    ],
    actions: [
      { label: 'Add Reminder',     defaultChecked: true  },
      { label: 'Add Remark',       defaultChecked: true  },
      { label: 'Send Mail',        defaultChecked: true  },
      { label: 'View Account',     defaultChecked: true  },
      { label: 'Manage Account',   defaultChecked: true  },
      { label: 'Change Status',    defaultChecked: true  },
      { label: 'Change Date',      defaultChecked: true  },
      { label: 'Re-Assign Account',defaultChecked: true  },
    ],
    defaultOrderByField: 'Account Date',
  },
  Customers: {
    leftTitle: 'Customer Attributes',
    fields: [
      'Customer Name', 'Added Date', 'Customer Category', 'Customer Owner',
      'Customer Status', 'Contact Person', 'Email', 'Phone', 'Address',
      'Customer Type', 'Product Category', 'Designation', 'Project Name',
      'State', 'Industry Type', 'GSTIN', 'State Code', 'Alternate Email',
      'Alternate Phone', 'Job No', 'Added By', 'Last Updated', 'Latest Remark',
    ],
    defaultSelected: [
      'Customer Name', 'Added Date', 'Email', 'Phone', 'Customer Status', 'Added By',
    ],
    actions: [
      { label: 'Add Reminder',    defaultChecked: true  },
      { label: 'Add Remark',      defaultChecked: true  },
      { label: 'Send Mail',       defaultChecked: true  },
      { label: 'View Customer',   defaultChecked: true  },
      { label: 'Manage Customer', defaultChecked: true  },
      { label: 'Change Status',   defaultChecked: true  },
    ],
    defaultOrderByField: 'Added Date',
  },
  Deals: {
    leftTitle: 'Deal Attributes',
    fields: [
      'Deal Name', 'Deal Status', 'Amount', 'Currency', 'Close Date',
      'Account Name', 'Owner', 'Created Date', 'Modified Date', 'Probability',
      'Source', 'Type', 'City', 'State', 'Country', 'Description',
      'Product Name', 'Added By', 'Added On',
    ],
    defaultSelected: [
      'Deal Name', 'Deal Status', 'Amount', 'Account Name', 'Close Date', 'Owner',
    ],
    actions: [
      { label: 'Add Reminder',  defaultChecked: true  },
      { label: 'Add Remark',    defaultChecked: true  },
      { label: 'Send Mail',     defaultChecked: true  },
      { label: 'View Deal',     defaultChecked: true  },
      { label: 'Change Status', defaultChecked: true  },
    ],
    defaultOrderByField: 'Close Date',
  },
  SR: {
    leftTitle: 'SR Attributes',
    fields: [
      'SR Title', 'SR Status', 'SR Priority', 'Account Name', 'Customer Name',
      'Owner', 'Created Date', 'Due Date', 'Modified Date', 'Category',
      'Description', 'Added By', 'Added On', 'Last Updated',
    ],
    defaultSelected: [
      'SR Title', 'SR Status', 'Account Name', 'Owner', 'Created Date',
    ],
    actions: [
      { label: 'Add Reminder',  defaultChecked: true  },
      { label: 'Add Remark',    defaultChecked: true  },
      { label: 'View SR',       defaultChecked: true  },
      { label: 'Change Status', defaultChecked: true  },
    ],
    defaultOrderByField: 'Created Date',
  },
  'Closed-SR': {
    leftTitle: 'Closed SR Attributes',
    fields: [
      'SR Title', 'SR Status', 'Account Name', 'Customer Name', 'Owner',
      'Created Date', 'Closed Date', 'Resolution', 'Category',
      'Added By', 'Added On',
    ],
    defaultSelected: [
      'SR Title', 'Account Name', 'Owner', 'Created Date', 'Closed Date',
    ],
    actions: [
      { label: 'Add Remark', defaultChecked: true  },
      { label: 'View SR',    defaultChecked: true  },
    ],
    defaultOrderByField: 'Closed Date',
  },
}

/* ── Toggle switch ──────────────────────────────────────── */
const Toggle = ({ on, onChange, colorOff = '#e67e22', colorOn = '#27ae60' }) => (
  <button
    type="button"
    className="svs-toggle"
    style={{ background: on ? colorOn : colorOff }}
    onClick={() => onChange(!on)}
  >
    <span className="svs-toggle-knob" style={{ left: on ? 20 : 3 }} />
  </button>
)

/* ── Context panel (right content) ─────────────────────── */
const ContextPanel = ({ ctx }) => {
  const data = CONTEXT_DATA[ctx]

  const [filtersOn,  setFiltersOn]  = useState(false)
  const [orderByOn,  setOrderByOn]  = useState(ctx === 'Accounts')
  const [ascOrder,   setAscOrder]   = useState(false)

  const [checkedActions, setCheckedActions] = useState(
    () => data.actions.reduce((acc, a) => ({ ...acc, [a.label]: a.defaultChecked }), {})
  )
  const [available, setAvailable] = useState(
    () => data.fields.filter((f) => !data.defaultSelected.includes(f))
  )
  const [selected, setSelected] = useState(data.defaultSelected)

  const addField    = (f) => { setAvailable((a) => a.filter((x) => x !== f)); setSelected((s) => [...s, f]) }
  const removeField = (f) => { setSelected((s) => s.filter((x) => x !== f)); setAvailable((a) => [...a, f]) }
  const toggleAction = (label) => setCheckedActions((p) => ({ ...p, [label]: !p[label] }))

  return (
    <div className="svs-content">

      {/* ── Add Additional Filters ─────────────────────── */}
      <div className="svs-row-bar">
        <span className="svs-row-label">Add Additional Filters</span>
        <Toggle on={filtersOn} onChange={setFiltersOn} />
        <span className={`svs-yn ${filtersOn ? 'svs-yn--yes' : 'svs-yn--no'}`}>
          {filtersOn ? 'YES' : 'NO'}
        </span>
      </div>

      {/* ── Actions ────────────────────────────────────── */}
      <div className="svs-actions-section">
        <span className="svs-actions-title">Actions</span>
        <div className="svs-actions-grid">
          {data.actions.map((a) => (
            <label key={a.label} className="svs-action-item">
              <input
                type="checkbox"
                checked={checkedActions[a.label] || false}
                onChange={() => toggleAction(a.label)}
              />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Add Order By ───────────────────────────────── */}
      <div className="svs-row-bar">
        <span className="svs-row-label">Add Order By</span>
        <Toggle on={orderByOn} onChange={setOrderByOn} colorOff="#2980b9" colorOn="#27ae60" />
        <span className={`svs-yn ${orderByOn ? 'svs-yn--yes' : 'svs-yn--no'}`}>
          {orderByOn ? 'YES' : 'NO'}
        </span>
      </div>

      {/* Order By card */}
      {orderByOn && (
        <div className="svs-orderby-section">
          <div className="svs-orderby-header">
            <span className="svs-orderby-icon">☰</span>
            <span className="svs-orderby-title">Order By</span>
          </div>
          <div className="svs-orderby-body">
            <div className="svs-orderby-card">
              <span className="svs-orderby-field">{data.defaultOrderByField}</span>
              <button type="button" className="svs-orderby-remove">
                <FaTimes />
              </button>
            </div>
            <div className="svs-orderby-asc-row">
              <span className="svs-orderby-asc-label">Ascending order :</span>
              <Toggle on={ascOrder} onChange={setAscOrder} colorOff="#e67e22" colorOn="#27ae60" />
              <span className={`svs-yn ${ascOrder ? 'svs-yn--yes' : 'svs-yn--no'}`}>
                {ascOrder ? 'YES' : 'NO'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-panel field picker ──────────────────────── */}
      <div className="svs-fields-row">
        <div className="svs-field-panel">
          <div className="svs-panel-header">
            <span className="svs-panel-icon">🔑</span>
            {data.leftTitle}
          </div>
          <div className="svs-field-list">
            {available.map((f) => (
              <button
                key={f}
                type="button"
                className="svs-field-item"
                onClick={() => addField(f)}
                title="Click to add"
              >
                <FaGripVertical className="svs-grip" />
                <span>{f}</span>
              </button>
            ))}
            {available.length === 0 && (
              <div className="svs-field-empty">All fields selected</div>
            )}
          </div>
        </div>

        <div className="svs-field-panel">
          <div className="svs-panel-header">
            <span className="svs-panel-icon">🔑</span>
            Selected Fields
          </div>
          <div className="svs-field-hint-row">
            Drag and drop to reorder the fields in listing
          </div>
          <div className="svs-field-list">
            {selected.map((f) => (
              <div key={f} className="svs-field-item svs-field-item--sel">
                <FaGripVertical className="svs-grip" />
                <span className="svs-field-name">{f}</span>
                <button
                  type="button"
                  className="svs-remove-btn"
                  onClick={() => removeField(f)}
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            {selected.length === 0 && (
              <div className="svs-field-empty">No fields selected</div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

/* ── Page ───────────────────────────────────────────────── */
const SearchViewSettingsPage = ({ basePath = '/admin/view-settings' }) => {
  const navigate = useNavigate()
  const [activeCtx, setActiveCtx] = useState('Accounts')

  return (
    <div className="svs-page">

      {/* Topbar */}
      <div className="svs-topbar">
        <button
          type="button"
          className="svs-back-btn"
          onClick={() => navigate(basePath)}
        >
          <FaChevronLeft /> Search View Settings
        </button>
        <button type="button" className="svs-save-btn">Save</button>
      </div>

      {/* Body: sidebar + content */}
      <div className="svs-body">

        {/* Left context tabs */}
        <aside className="svs-sidebar">
          {CONTEXTS.map((ctx) => (
            <button
              key={ctx}
              type="button"
              className={`svs-ctx-btn ${activeCtx === ctx ? 'svs-ctx-btn--active' : ''}`}
              onClick={() => setActiveCtx(ctx)}
            >
              {ctx}
            </button>
          ))}
        </aside>

        {/* Right panel — re-mount when context changes so state resets */}
        <main className="svs-main">
          <ContextPanel key={activeCtx} ctx={activeCtx} />
        </main>

      </div>
    </div>
  )
}

export default SearchViewSettingsPage
