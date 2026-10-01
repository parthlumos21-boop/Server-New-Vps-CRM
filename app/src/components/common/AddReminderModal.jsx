import React, { useState } from 'react'
import { FaCalendarAlt } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { addStandaloneReminder } from '../../features/standaloneReminders/standaloneReminderStorage'
import './AddReminderModal.css'

const REMINDER_TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const REMINDER_MODES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit', 'Follow Up', 'Demo', 'Other']

const getInitialFormState = () => ({
  title: '',
  reminderDate: '',
  reminderTime: '09:00',
  reminderMode: 'Call',
  note: '',
  createTask: true,
})

/**
 * AddReminderModal
 *
 * Props:
 *   isOpen      – boolean
 *   onClose     – () => void
 *   contextLabel – optional string shown below the title (e.g. "abc | 1006")
 *   createdBy   – name of the logged-in user
 *   onSaved     – optional (reminder) => void callback after save
 */
const AddReminderModal = ({ isOpen, onClose, contextLabel = '', createdBy = '', onSaved }) => {
  const { user } = useAuth()
  const { createReminder, addNotification } = useData()
  const [form, setForm] = useState(getInitialFormState)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setForm(getInitialFormState())
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.title.trim()) {
      alert('Please enter a reminder title.')
      return
    }

    if (!form.reminderDate) {
      alert('Please select a reminder date.')
      return
    }

    setSaving(true)

    const reminderTime = form.reminderTime || '09:00'
    const reminderPayload = {
      title: form.title.trim(),
      message: form.note.trim(),
      remindAt: `${form.reminderDate}T${reminderTime}:00`,
      status: 'scheduled',
      reminderDate: form.reminderDate,
      reminderTime,
      reminderMode: form.reminderMode,
      assignedTo: user?.id,
    }

    const result = await createReminder(reminderPayload)
    const saved = result.success
      ? result.data
      : addStandaloneReminder({
        title: form.title.trim(),
        reminderDate: form.reminderDate,
        reminderTime,
        reminderMode: form.reminderMode,
        note: form.note.trim(),
        createdBy,
        createTask: form.createTask,
      })

    if (!result.success) {
      addNotification?.('warning', 'Reminder saved locally', result.message || 'MongoDB reminder save failed, so this reminder was kept on this device.')
    }

    setSaving(false)

    if (onSaved) onSaved(saved)
    handleClose()
  }

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="arm-overlay" role="dialog" aria-modal="true" aria-label="Add Reminder">
      <div className="arm-card">
        {/* ── Header ── */}
        <div className="arm-head">
          <div>
            <div className="arm-head-kicker">ADD REMINDER</div>
            <h2 className="arm-head-title">Add Reminder</h2>
            {contextLabel && <div className="arm-head-sub">{contextLabel}</div>}
          </div>
          <button type="button" className="arm-close-btn" onClick={handleClose} aria-label="Close">×</button>
        </div>

        {/* ── Body ── */}
        <form className="arm-body" onSubmit={handleSubmit} id="add-reminder-form">

          {/* Title */}
          <div className="arm-section">
            <label className="arm-label" htmlFor="arm-title">Reminder Title *</label>
            <input
              id="arm-title"
              type="text"
              className="arm-title-input"
              placeholder="Enter reminder title..."
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Date + Mode */}
          <div className="arm-grid-2">
            <div className="arm-section">
              <label className="arm-label" htmlFor="arm-date">Reminder Date *</label>
              <input
                id="arm-date"
                type="date"
                className="arm-date-input"
                value={form.reminderDate}
                onChange={(e) => set('reminderDate', e.target.value)}
                required
              />
            </div>

            <div className="arm-section">
              <label className="arm-label" htmlFor="arm-mode">Reminder Mode</label>
              <select
                id="arm-mode"
                className="arm-mode-select"
                value={form.reminderMode}
                onChange={(e) => set('reminderMode', e.target.value)}
              >
                {REMINDER_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Time chips */}
          <div className="arm-section">
            <label className="arm-label">Reminder Time</label>
            <div className="arm-time-chips">
              {REMINDER_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`arm-time-chip${form.reminderTime === t ? ' arm-time-chip--active' : ''}`}
                  onClick={() => set('reminderTime', t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="arm-other-wrap">
              <span className="arm-other-label">Other</span>
              <input
                type="time"
                className="arm-other-input"
                value={form.reminderTime}
                onChange={(e) => set('reminderTime', e.target.value)}
              />
            </div>
          </div>

          {/* Note */}
          <div className="arm-section">
            <label className="arm-label" htmlFor="arm-note">Reminder Note</label>
            <textarea
              id="arm-note"
              className="arm-note-textarea"
              placeholder="Add reminder note here..."
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={4}
            />
          </div>

          {/* Link to Task + Calendar badge */}
          <div className="arm-section">
            <label className="arm-link-row">
              <input
                type="checkbox"
                className="arm-link-checkbox"
                checked={form.createTask}
                onChange={(e) => set('createTask', e.target.checked)}
              />
              <span className="arm-link-label">Also add to Task List</span>
            </label>
            <div className="arm-cal-badge">
              <FaCalendarAlt />
              <span>Automatically linked to Calendar</span>
            </div>
          </div>

        </form>

        {/* ── Footer ── */}
        <div className="arm-foot">
          <button
            type="button"
            className="arm-btn arm-btn--outline"
            onClick={handleClose}
          >
            Close
          </button>
          <div className="arm-foot-spacer" />
          <button
            type="submit"
            form="add-reminder-form"
            className="arm-btn arm-btn--primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddReminderModal
