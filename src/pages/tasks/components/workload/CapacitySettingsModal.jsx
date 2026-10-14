import React, { useState } from 'react'
import { FaTimes, FaSlidersH, FaCheck } from 'react-icons/fa'

export const CapacitySettingsModal = ({
  user,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [weeklyHours, setWeeklyHours] = useState(user?.weeklyCapacityHours || 40)
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable !== false)
  const [notes, setNotes] = useState(user?.notes || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      weeklyCapacityHours: Number(weeklyHours) || 40,
      isAvailable,
      notes,
      userEmail: user.email,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          border: '1.5px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafbfc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaSlidersH style={{ color: '#c60016' }} />
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#1e293b' }}>
              Capacity Configuration
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
              User
            </label>
            <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1e293b' }}>
              {user?.name || user?.email}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {user?.email} &bull; {user?.role || 'User'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
              Weekly Work Capacity (Hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem', display: 'block' }}>
              Standard work week is 40 hours (8 hours/day).
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                style={{ accentColor: '#c60016' }}
              />
              <span>Available for task assignments</span>
            </label>
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
              Internal Notes (Optional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lead estimator for North zone projects"
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.78rem',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.45rem 0.95rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 1.15rem',
                backgroundColor: '#c60016',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#ffffff',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(198, 0, 22, 0.25)',
              }}
            >
              <FaCheck style={{ fontSize: '0.7rem' }} />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CapacitySettingsModal
