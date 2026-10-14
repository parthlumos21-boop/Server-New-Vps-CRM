import React from 'react'
import {
  FaCheckCircle,
  FaHourglassHalf,
  FaCalendarTimes,
  FaTasks,
} from 'react-icons/fa'

export const WorkloadKpiCards = ({ summary = {}, periodLabel = 'the selected period', onCardClick }) => {
  const cards = [
    {
      id: 'completed',
      title: 'Completed Tasks',
      value: summary.completedTasks ?? 0,
      subtext: `Tasks completed in ${periodLabel}`,
      icon: <FaCheckCircle />,
      iconBg: '#10b981',
      bottomColor: '#10b981',
    },
    {
      id: 'incomplete',
      title: 'Incomplete Tasks',
      value: summary.incompleteTasks ?? 0,
      subtext: 'Tasks still open or in progress',
      icon: <FaHourglassHalf />,
      iconBg: '#f97316',
      bottomColor: '#f97316',
    },
    {
      id: 'overdue',
      title: 'Overdue Tasks',
      value: summary.overdueTasks ?? 0,
      subtext: 'Uncompleted tasks past deadline',
      icon: <FaCalendarTimes />,
      iconBg: '#ef4444',
      bottomColor: '#ef4444',
    },
    {
      id: 'total',
      title: 'Total Tasks',
      value: summary.totalTasks ?? 0,
      subtext: 'Distinct tasks in scope',
      icon: <FaTasks />,
      iconBg: '#3b82f6',
      bottomColor: '#3b82f6',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.85rem',
      }}
    >
      {cards.map((c) => (
        <div
          key={c.id}
          onClick={() => onCardClick && onCardClick(c.id)}
          style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderBottom: `3.5px solid ${c.bottomColor}`,
            borderRadius: '14px',
            padding: '1rem 1.15rem',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.5rem',
            cursor: onCardClick ? 'pointer' : 'default',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (onCardClick) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.06)'
            }
          }}
          onMouseLeave={(e) => {
            if (onCardClick) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.03)'
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b' }}>
              {c.title}
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: c.iconBg,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                boxShadow: `0 2px 8px ${c.iconBg}40`,
              }}
            >
              {c.icon}
            </div>
          </div>

          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: '900',
              color: '#1e293b',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {c.value < 10 && c.value >= 0 ? `0${c.value}` : c.value}
          </div>

          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {c.subtext}
          </div>
        </div>
      ))}
    </div>
  )
}

export default WorkloadKpiCards
