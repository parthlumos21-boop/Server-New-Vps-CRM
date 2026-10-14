import React, { useState } from 'react'
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaCircle,
} from 'react-icons/fa'

export const WorkloadUserCalendar = ({ tasks = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // Group tasks by day of month
  const tasksByDay = {}
  tasks.forEach((t) => {
    if (!t.dueDate) return
    const d = new Date(t.dueDate)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate()
      if (!tasksByDay[dayNum]) tasksByDay[dayNum] = []
      tasksByDay[dayNum].push(t)
    }
  })

  // Generate calendar grid cells
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.15rem 1.25rem',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Month Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaCalendarAlt style={{ color: '#c60016' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>
            {monthNames[month]} {year}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{
              padding: '4px 8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#475569',
              fontSize: '0.72rem',
            }}
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            style={{
              padding: '4px 10px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#334155',
              fontSize: '0.72rem',
              fontWeight: '700',
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            style={{
              padding: '4px 8px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#475569',
              fontSize: '0.72rem',
            }}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: '800', color: '#64748b' }}>
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {blanks.map((b) => (
          <div key={`blank-${b}`} style={{ height: '70px', backgroundColor: '#fafbfc', borderRadius: '6px' }} />
        ))}

        {days.map((day) => {
          const dayTasks = tasksByDay[day] || []
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year

          return (
            <div
              key={`day-${day}`}
              style={{
                height: '70px',
                border: isToday ? '1.5px solid #c60016' : '1px solid #f1f5f9',
                backgroundColor: isToday ? '#fff1f2' : '#ffffff',
                borderRadius: '6px',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: isToday ? '900' : '700',
                  color: isToday ? '#c60016' : '#334155',
                  marginBottom: '2px',
                }}
              >
                {day}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
                {dayTasks.slice(0, 2).map((t) => {
                  const isCompleted = ['completed', 'closed'].includes(t.status)
                  const isOverdue = !isCompleted && new Date(t.dueDate) < new Date()

                  return (
                    <div
                      key={t.id || t._id}
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: '700',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        backgroundColor: isCompleted ? '#dcfce7' : isOverdue ? '#fee2e2' : '#e0f2fe',
                        color: isCompleted ? '#166534' : isOverdue ? '#b91c1c' : '#0369a1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={`${t.title} (${t.status})`}
                    >
                      {t.title}
                    </div>
                  )
                })}
                {dayTasks.length > 2 && (
                  <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: '700' }}>
                    +{dayTasks.length - 2} more
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

export default WorkloadUserCalendar
