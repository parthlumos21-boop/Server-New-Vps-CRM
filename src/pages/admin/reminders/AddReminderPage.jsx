import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBell, FaCalendarAlt, FaChevronLeft } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { calendarApi } from '../../../services/calendarApi'
import './AdminRemindersPage.css'

const REMINDER_TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const REMINDER_MODES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit', 'Follow Up', 'Demo', 'Other']

const AddReminderPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { accounts = [], deals = [], createReminder, createTask, addNotification } = useData()

  const [entityType, setEntityType] = useState('account') // 'account' | 'deal'
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedDealId, setSelectedDealId] = useState('')

  const [title, setTitle] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('09:00')
  const [reminderMode, setReminderMode] = useState('Call')
  const [note, setNote] = useState('')
  const [createTaskFlag, setCreateTaskFlag] = useState(true)
  const [saving, setSaving] = useState(false)

  const isAdmin = Boolean(user?.role === 'admin')
  const myRemindersPath = isAdmin ? '/admin/reminders/my' : '/reminders/my'

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim()) {
      alert('Please enter a reminder title.')
      return
    }

    if (!reminderDate) {
      alert('Please select a reminder date.')
      return
    }

    let relatedEntityType = ''
    let relatedEntityId = ''
    let extraMeta = {}

    if (entityType === 'account') {
      if (!selectedAccountId) {
        alert('Please select an Account.')
        return
      }
      const acc = accounts.find((a) => String(a.id || a._id) === String(selectedAccountId))
      relatedEntityType = 'account'
      relatedEntityId = selectedAccountId
      extraMeta = {
        accountId: selectedAccountId,
        accountName: acc?.name || acc?.accountName || acc?.companyName || '',
        accountNumber: acc?.accountNumber || acc?.accountNo || '',
      }
    } else if (entityType === 'deal') {
      if (!selectedDealId) {
        alert('Please select a Deal.')
        return
      }
      const deal = deals.find((d) => String(d.id || d._id) === String(selectedDealId))
      relatedEntityType = 'deal'
      relatedEntityId = selectedDealId
      extraMeta = {
        dealId: selectedDealId,
        dealName: deal?.name || deal?.title || deal?.dealName || '',
        dealNumber: deal?.dealNumber || deal?.dealNo || '',
        accountId: deal?.accountId || '',
        accountName: deal?.accountName || '',
      }
    }

    setSaving(true)

    const finalTime = reminderTime || '09:00'
    const remindAt = `${reminderDate}T${finalTime}:00`
    const assignedTo = user?.id

    const reminderPayload = {
      title: title.trim(),
      message: note.trim(),
      remindAt,
      status: 'scheduled',
      reminderDate,
      reminderTime: finalTime,
      reminderMode,
      assignedTo,
      relatedEntityType,
      relatedEntityId,
      ...extraMeta,
    }

    try {
      const result = await createReminder(reminderPayload)

      if (result.success) {
        try {
          await calendarApi.createEvent({
            title: title.trim(),
            description: note.trim(),
            startAt: remindAt,
            category: 'Reminder',
            assignedTo,
            relatedEntityType,
            relatedEntityId,
          })
        } catch (err) {
          console.error('Failed to create calendar event for reminder', err)
        }

        if (createTaskFlag) {
          await createTask({
            title: title.trim(),
            description: [note.trim(), '(Linked to Reminder)'].filter(Boolean).join('\n'),
            status: 'pending',
            priority: 'medium',
            dueDate: reminderDate,
            relatedEntityType: relatedEntityType || 'reminder',
            relatedEntityId: relatedEntityId || result.data?.id || result.data?._id,
            assignedTo,
          })
        }

        addNotification?.('success', 'Reminder Created', 'Reminder successfully created and saved to MongoDB.')
      } else {
        addNotification?.('warning', 'Reminder Saved', result.message || 'Saved local reminder record.')
      }

      navigate(myRemindersPath)
    } catch (err) {
      console.error('Error creating reminder:', err)
      alert('Failed to save reminder.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-reminders-page" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => navigate(myRemindersPath)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#334155',
          }}
        >
          <FaChevronLeft /> Back to Reminders
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaBell style={{ color: '#dc2626' }} /> Create New Reminder
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Create a reminder directly linked to Accounts (Leads) or Deals
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.75rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        {/* Top Field: Account or Deal Selection */}
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            Select Entity Context *
          </label>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
              <input
                type="radio"
                name="entityTypeRadio"
                value="account"
                checked={entityType === 'account'}
                onChange={() => { setEntityType('account'); setSelectedDealId(''); }}
              />
              Account (Leads Collection)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
              <input
                type="radio"
                name="entityTypeRadio"
                value="deal"
                checked={entityType === 'deal'}
                onChange={() => { setEntityType('deal'); setSelectedAccountId(''); }}
              />
              Deal (Deals Collection)
            </label>
          </div>

          {entityType === 'account' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>
                Choose Account *
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 500 }}
              >
                <option value="">-- Select Account from Leads --</option>
                {accounts.map((acc) => (
                  <option key={acc.id || acc._id} value={acc.id || acc._id}>
                    {acc.name || acc.accountName || acc.companyName || 'Account'} {acc.accountNumber || acc.accountNo ? `(${acc.accountNumber || acc.accountNo})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {entityType === 'deal' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>
                Choose Deal *
              </label>
              <select
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 500 }}
              >
                <option value="">-- Select Deal from Deals Collection --</option>
                {deals.map((deal) => (
                  <option key={deal.id || deal._id} value={deal.id || deal._id}>
                    {deal.name || deal.title || deal.dealName || 'Deal'} {deal.dealNumber || deal.dealNo ? `(${deal.dealNumber || deal.dealNo})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Title Field */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
            Reminder Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter reminder title..."
            required
            style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>

        {/* Date + Mode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Reminder Date *
            </label>
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Reminder Mode
            </label>
            <select
              value={reminderMode}
              onChange={(e) => setReminderMode(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              {REMINDER_MODES.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Chips */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Reminder Time
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {REMINDER_TIMES.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setReminderTime(time)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '20px',
                  border: reminderTime === time ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  background: reminderTime === time ? '#fee2e2' : '#f8fafc',
                  color: reminderTime === time ? '#991b1b' : '#334155',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {time}
              </button>
            ))}
          </div>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}
          />
        </div>

        {/* Reminder Note */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
            Reminder Note / Details
          </label>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add reminder note details..."
            style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', resize: 'vertical' }}
          />
        </div>

        {/* Also Add to Task List */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#1e293b', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={createTaskFlag}
              onChange={(e) => setCreateTaskFlag(e.target.checked)}
            />
            Also add to Task List
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => navigate(myRemindersPath)}
            style={{ padding: '0.625rem 1.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '0.625rem 1.5rem', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Reminder'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddReminderPage
