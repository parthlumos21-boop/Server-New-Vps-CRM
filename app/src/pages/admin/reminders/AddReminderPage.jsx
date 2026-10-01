import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBell, FaCalendarAlt, FaClipboardList } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { addStandaloneReminder } from '../../../features/standaloneReminders/standaloneReminderStorage'
import './AddReminderPage.css'

const REMINDER_TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const REMINDER_MODES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit', 'Follow Up', 'Demo', 'Other']

const getInitialState = () => ({
  title: '',
  reminderDate: '',
  reminderTime: '09:00',
  reminderMode: 'Call',
  note: '',
  createTask: true,
})

const AddReminderPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(getInitialState)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e) => {
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

    addStandaloneReminder({
      title: form.title.trim(),
      reminderDate: form.reminderDate,
      reminderTime: form.reminderTime,
      reminderMode: form.reminderMode,
      note: form.note.trim(),
      createdBy: user?.name || '',
      createTask: form.createTask,
    })

    setSaving(false)
    setSaved(true)

    setTimeout(() => {
      navigate(-1)
    }, 1200)
  }

  const handleReset = () => {
    setForm(getInitialState())
    setSaved(false)
  }

  return (
    <div className="arp-page">
      <div className="arp-shell">

        {/* Header */}
        <div className="arp-head">
          <div className="arp-head-icon">
            <FaBell />
          </div>
          <div className="arp-head-copy">
            <div className="arp-head-kicker">NEW REMINDER</div>
            <h1 className="arp-head-title">Add Reminder</h1>
            <p className="arp-head-sub">
              Reminders are automatically linked to the{' '}
              <strong>Calendar</strong> and can also appear in{' '}
              <strong>Tasks</strong>.
            </p>
          </div>
          <div className="arp-head-links">
            <span className="arp-head-link-badge">
              <FaCalendarAlt /> Calendar
            </span>
            <span className="arp-head-link-badge arp-head-link-badge--tasks">
              <FaClipboardList /> Tasks
            </span>
          </div>
        </div>

        {saved && (
          <div className="arp-success-banner">
            ✓ Reminder saved! Redirecting…
          </div>
        )}

        <form className="arp-form" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="arp-field arp-field--wide">
            <label className="arp-label" htmlFor="arp-title">Reminder Title *</label>
            <input
              id="arp-title"
              type="text"
              className="arp-input"
              placeholder="Enter reminder title…"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Date + Mode */}
          <div className="arp-row-2">
            <div className="arp-field">
              <label className="arp-label" htmlFor="arp-date">Reminder Date *</label>
              <input
                id="arp-date"
                type="date"
                className="arp-input"
                value={form.reminderDate}
                onChange={(e) => set('reminderDate', e.target.value)}
                required
              />
            </div>
            <div className="arp-field">
              <label className="arp-label" htmlFor="arp-mode">Reminder Mode</label>
              <select
                id="arp-mode"
                className="arp-select"
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
          <div className="arp-field arp-field--wide">
            <label className="arp-label">Reminder Time</label>
            <div className="arp-chips">
              {REMINDER_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`arp-chip${form.reminderTime === t ? ' arp-chip--active' : ''}`}
                  onClick={() => set('reminderTime', t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="arp-other-wrap">
              <span className="arp-other-label">Other</span>
              <input
                type="time"
                className="arp-other-input"
                value={form.reminderTime}
                onChange={(e) => set('reminderTime', e.target.value)}
              />
            </div>
          </div>

          {/* Note */}
          <div className="arp-field arp-field--wide">
            <label className="arp-label" htmlFor="arp-note">Reminder Note</label>
            <textarea
              id="arp-note"
              className="arp-textarea"
              placeholder="Add reminder note here…"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={4}
            />
          </div>

          {/* Link to Task */}
          <div className="arp-field arp-field--wide">
            <label className="arp-check-row">
              <input
                type="checkbox"
                className="arp-checkbox"
                checked={form.createTask}
                onChange={(e) => set('createTask', e.target.checked)}
              />
              <span className="arp-check-label">Also add to Task List</span>
            </label>
          </div>

          {/* Actions */}
          <div className="arp-actions">
            <button
              type="button"
              className="arp-btn arp-btn--outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="arp-btn arp-btn--ghost"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="submit"
              className="arp-btn arp-btn--primary"
              disabled={saving || saved}
            >
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddReminderPage
