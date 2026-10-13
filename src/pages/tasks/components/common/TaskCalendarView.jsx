import React, { useState, useMemo } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

export const TaskCalendarView = ({ tasks = [], onOpenTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Generate grid calendar days
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const cells = []

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        monthOffset: -1,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        monthOffset: 0,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      })
    }

    // Next month padding days to complete 35 or 42 cells
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        monthOffset: 1,
        dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      })
    }

    return cells
  }, [year, month])

  // Map tasks to dates
  const tasksByDate = useMemo(() => {
    const map = {}
    tasks.forEach((t) => {
      if (!t.dueDate) return
      const ds = String(t.dueDate).slice(0, 10)
      if (!map[ds]) map[ds] = []
      map[ds].push(t)
    })
    return map
  }, [tasks])

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Month Navigation Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            {monthNames[month]} {year}
          </h2>
          <button
            type="button"
            onClick={handleToday}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
            }}
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
            }}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '0.75rem',
          color: '#64748b',
          marginBottom: '6px',
        }}
      >
        {daysOfWeek.map((day) => (
          <div key={day} style={{ padding: '0.4rem' }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {calendarCells.map((cell, idx) => {
          const isCurrentMonth = cell.monthOffset === 0
          const isToday = cell.dateStr === todayStr
          const dayTasks = tasksByDate[cell.dateStr] || []

          return (
            <div
              key={idx}
              style={{
                minHeight: '90px',
                background: isCurrentMonth ? '#ffffff' : '#f8fafc',
                border: isToday ? '1.5px solid #2563eb' : '1px solid #f1f5f9',
                borderRadius: '8px',
                padding: '0.35rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                opacity: isCurrentMonth ? 1 : 0.45,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: isToday ? '800' : '600',
                    color: isToday ? '#2563eb' : '#334155',
                    width: isToday ? '20px' : 'auto',
                    height: isToday ? '20px' : 'auto',
                    borderRadius: isToday ? '50%' : 'none',
                    background: isToday ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cell.day}
                </span>
                {dayTasks.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      color: '#64748b',
                    }}
                  >
                    {dayTasks.length}
                  </span>
                )}
              </div>

              {/* Task Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
                {dayTasks.slice(0, 3).map((t) => {
                  const isDone = ['completed', 'closed'].includes(String(t.status || '').toLowerCase())
                  return (
                    <div
                      key={t.id}
                      onClick={() => onOpenTask(t)}
                      style={{
                        padding: '0.18rem 0.35rem',
                        borderRadius: '4px',
                        background: isDone ? '#f0fdf4' : '#eff6ff',
                        color: isDone ? '#15803d' : '#1d4ed8',
                        fontSize: '0.68rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        borderLeft: isDone ? '2px solid #16a34a' : '2px solid #2563eb',
                      }}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  )
                })}
                {dayTasks.length > 3 && (
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '600' }}>
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TaskCalendarView
