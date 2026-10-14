import React, { useState, useEffect } from 'react'
import { FaPlay, FaPause, FaStop, FaPlus, FaClock, FaCheckCircle } from 'react-icons/fa'

export default function TaskTimeLogTab({
  timeEntries = [],
  onAddTimeEntry,
  isLogging = false,
}) {
  // Live Timer State
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [timerNote, setTimerNote] = useState('')

  // Manual Log State
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualMinutes, setManualMinutes] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualNote, setManualNote] = useState('')
  const [isBillable, setIsBillable] = useState(true)

  useEffect(() => {
    let interval = null
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [timerRunning])

  const formatTimerDigits = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStopAndSaveTimer = () => {
    setTimerRunning(false)
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60))
    onAddTimeEntry({
      minutes,
      description: timerNote || 'Timer session',
      date: new Date().toISOString().slice(0, 10),
      isBillable: true,
    })
    setElapsedSeconds(0)
    setTimerNote('')
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const mins = Number(manualMinutes)
    if (!mins || mins <= 0) return
    onAddTimeEntry({
      minutes: mins,
      description: manualNote || 'Manual entry',
      date: manualDate,
      isBillable,
    })
    setManualMinutes('')
    setManualNote('')
    setShowManualForm(false)
  }

  const totalMinutes = timeEntries.reduce((acc, curr) => acc + (Number(curr.minutes) || 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMins = totalMinutes % 60

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.25rem 1.5rem',
        gap: '1.25rem',
        overflowY: 'auto',
      }}
    >
      {/* Live Stopwatch Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
            }}
          >
            <FaClock />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#14532d', fontFamily: 'monospace' }}>
              {formatTimerDigits(elapsedSeconds)}
            </div>
            <input
              type="text"
              placeholder="What are you working on?"
              value={timerNote}
              onChange={(e) => setTimerNote(e.target.value)}
              style={{
                fontSize: '0.74rem',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: '#166534',
                marginTop: '2px',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!timerRunning ? (
            <button
              type="button"
              onClick={() => setTimerRunning(true)}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <FaPlay style={{ fontSize: '0.65rem' }} />
              <span>Start</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setTimerRunning(false)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FaPause style={{ fontSize: '0.65rem' }} />
                <span>Pause</span>
              </button>
              <button
                type="button"
                onClick={handleStopAndSaveTimer}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FaStop style={{ fontSize: '0.65rem' }} />
                <span>Log Time</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manual Entry Button / Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
            Logged Time History ({totalHours}h {remainingMins}m total)
          </span>

          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'none',
              border: 'none',
              color: '#c60016',
              fontSize: '0.76rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <FaPlus style={{ fontSize: '0.65rem' }} />
            <span>Add Manual Entry</span>
          </button>
        </div>

        {showManualForm && (
          <form
            onSubmit={handleManualSubmit}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.65rem',
              padding: '0.85rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fafbfc',
            }}
          >
            <div>
              <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Minutes
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 45"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                required
                style={{ width: '100%', padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Date
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Work Note
              </label>
              <input
                type="text"
                placeholder="Description of work done..."
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  style={{ accentColor: '#c60016' }}
                />
                <span>Billable entry</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  style={{ padding: '4px 10px', fontSize: '0.72rem', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualMinutes || isLogging}
                  style={{ padding: '4px 12px', fontSize: '0.74rem', fontWeight: '700', backgroundColor: '#c60016', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Save Entry
                </button>
              </div>
            </div>
          </form>
        )}

        {/* History List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {timeEntries.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
              No time logs recorded for this task.
            </div>
          ) : (
            timeEntries.map((te) => {
              const mins = Number(te.minutes) || 0
              const hrs = Math.floor(mins / 60)
              const remaining = mins % 60
              const durationStr = hrs > 0 ? `${hrs}h ${remaining}m` : `${remaining}m`

              return (
                <div
                  key={te.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                      {te.description || 'Task work'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {te.userName || te.userEmail || 'User'} &bull; {te.date || 'Recent'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {te.isBillable && (
                      <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fff1f2', color: '#c60016', fontWeight: '700' }}>
                        Billable
                      </span>
                    )}
                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f172a' }}>
                      {durationStr}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
