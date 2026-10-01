import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronLeft, FaGripVertical, FaTimes, FaWrench } from 'react-icons/fa'
import './ViewDealsViewPage.css'

/* ── Step definitions ───────────────────────────────────── */
const STEPS = [
  { num: 1, label: 'Classification' },
  { num: 2, label: 'Additional Filters' },
  { num: 3, label: 'View Fields' },
]

/* ── Deal statuses ──────────────────────────────────────── */
const DEAL_STATUSES = [
  'New', 'Closed-Won', 'Closed-Lost', 'Quotation Sent',
  'Quotation Revision', 'Convert To PO', 'Order Lost', 'Order Received',
]

const DEFAULT_STATUSES_ON = [
  'New', 'Closed-Won', 'Closed-Lost', 'Quotation Sent',
  'Quotation Revision', 'Convert To PO', 'Order Lost',
]

/* ── Deal fields ────────────────────────────────────────── */
const ALL_FIELDS = [
  'Deal Name', 'Deal Status', 'Deal Stage', 'Amount', 'Currency',
  'Close Date', 'Account Name', 'Owner', 'Created Date', 'Modified Date',
  'Probability', 'Source', 'Type', 'Lead Source', 'City', 'State',
  'Country', 'Description', 'Product Name', 'Quantity', 'Unit Price',
  'Discount', 'Tax', 'Added By', 'Added On',
]

const DEFAULT_SELECTED = [
  'Deal Name', 'Deal Status', 'Amount', 'Account Name', 'Close Date', 'Owner',
]

/* ── Status chip ────────────────────────────────────────── */
const StatusChip = ({ label, isOn, onToggle }) => (
  <button
    type="button"
    className={`vdv-chip ${isOn ? 'vdv-chip--on' : 'vdv-chip--off'}`}
    onClick={onToggle}
  >
    <span className="vdv-chip-state">{isOn ? 'ON' : 'OFF'}</span>
    <span className="vdv-chip-square" />
    <span className="vdv-chip-label">{label}</span>
  </button>
)

/* ── Main component ─────────────────────────────────────── */
const ViewDealsViewPage = ({ basePath = '/admin/view-settings' }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  /* Classification state */
  const [classifyField, setClassifyField] = useState('Deal Status')
  const [statusMap, setStatusMap] = useState(
    () => DEAL_STATUSES.reduce((acc, s) => ({
      ...acc,
      [s]: DEFAULT_STATUSES_ON.includes(s),
    }), {})
  )

  /* View fields state */
  const [available, setAvailable] = useState(
    () => ALL_FIELDS.filter((f) => !DEFAULT_SELECTED.includes(f))
  )
  const [selected, setSelected] = useState(DEFAULT_SELECTED)

  const toggleStatus = (s) => setStatusMap((p) => ({ ...p, [s]: !p[s] }))

  const addField    = (f) => { setAvailable((a) => a.filter((x) => x !== f)); setSelected((s) => [...s, f]) }
  const removeField = (f) => { setSelected((s) => s.filter((x) => x !== f)); setAvailable((a) => [...a, f]) }

  return (
    <div className="vdv-page">

      {/* ── Top bar ──────────────────────────────────────── */}
      <div className="vdv-topbar">
        <button
          type="button"
          className="vdv-back-btn"
          onClick={() => navigate(basePath)}
        >
          <FaChevronLeft />
          View Deals View
        </button>
      </div>

      {/* ── Wizard panel ─────────────────────────────────── */}
      <div className="vdv-panel">

        {/* Panel title */}
        <div className="vdv-panel-title-row">
          <FaWrench className="vdv-panel-icon" />
          <span className="vdv-panel-title">Configure View Deals View</span>
        </div>

        {/* Step progress bar */}
        <div className="vdv-steps">
          {STEPS.map((s) => (
            <div key={s.num} className="vdv-step">
              <span className={`vdv-step-num ${step === s.num ? 'vdv-step-num--active' : ''}`}>
                {s.num}
              </span>
              <span className={`vdv-step-label ${step === s.num ? 'vdv-step-label--active' : ''}`}>
                {s.num > 1 && <span className="vdv-step-arrow">→</span>}
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="vdv-divider" />

        {/* ── Step 1: Classification ──────────────────────── */}
        {step === 1 && (
          <div className="vdv-step-body">
            <div className="vdv-classify-box">
              <h3 className="vdv-classify-title">
                Configure the View based on Classification
              </h3>

              <div className="vdv-cf-row">
                <span className="vdv-cf-label">Classification Field</span>
                <select
                  className="vdv-cf-select"
                  value={classifyField}
                  onChange={(e) => setClassifyField(e.target.value)}
                >
                  <option>Deal Status</option>
                  <option>Deal Stage</option>
                </select>
              </div>

              <div className="vdv-status-box">
                <div className="vdv-status-hint-row">
                  <span className="vdv-status-hint">
                    Choose the {classifyField} to be listed in the view
                  </span>
                  <span className="vdv-sort-btn" title="Sort">
                    <span className="vdv-sort-icon">A↕Z</span>
                  </span>
                </div>

                <div className="vdv-chips">
                  {DEAL_STATUSES.map((s) => (
                    <StatusChip
                      key={s}
                      label={s}
                      isOn={statusMap[s]}
                      onToggle={() => toggleStatus(s)}
                    />
                  ))}
                </div>

                <p className="vdv-drag-hint">
                  <span className="vdv-hint-icon">ℹ</span>
                  Drag and drop to reorder the values.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Additional Filters ─────────────────── */}
        {step === 2 && (
          <div className="vdv-step-body vdv-step-body--placeholder">
            <p className="vdv-placeholder-text">
              Step 2 - Additional Filters: configure filter conditions for this view.
            </p>
          </div>
        )}

        {/* ── Step 3: View Fields ────────────────────────── */}
        {step === 3 && (
          <div className="vdv-fields-row">

            <div className="vdv-field-panel">
              <div className="vdv-panel-header">Deal Attributes</div>
              <div className="vdv-field-list">
                {available.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="vdv-field-item"
                    onClick={() => addField(f)}
                    title="Click to add"
                  >
                    <FaGripVertical className="vdv-grip" />
                    <span>{f}</span>
                  </button>
                ))}
                {available.length === 0 && (
                  <div className="vdv-field-empty">All fields selected</div>
                )}
              </div>
            </div>

            <div className="vdv-field-panel">
              <div className="vdv-panel-header">Selected Fields</div>
              <div className="vdv-field-hint-row">
                Drag and drop to reorder the fields in listing
              </div>
              <div className="vdv-field-list">
                {selected.map((f) => (
                  <div key={f} className="vdv-field-item vdv-field-item--sel">
                    <FaGripVertical className="vdv-grip" />
                    <span className="vdv-field-name">{f}</span>
                    <button
                      type="button"
                      className="vdv-remove-btn"
                      onClick={() => removeField(f)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
                {selected.length === 0 && (
                  <div className="vdv-field-empty">No fields selected</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── Footer nav ───────────────────────────────────── */}
        <div className="vdv-footer">
          <button
            type="button"
            className="vdv-nav-btn"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            ← Back
          </button>
          <button
            type="button"
            className="vdv-nav-btn vdv-nav-btn--next"
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
            disabled={step === STEPS.length}
          >
            Next →
          </button>
        </div>

      </div>
    </div>
  )
}

export default ViewDealsViewPage
