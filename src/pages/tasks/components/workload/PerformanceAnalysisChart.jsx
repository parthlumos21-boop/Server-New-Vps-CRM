import React from 'react'

export const PerformanceAnalysisChart = ({ performanceData = {} }) => {
  const onTrack = performanceData.onTrack || { count: 0, percent: 0 }
  const beforeTime = performanceData.beforeTime || { count: 0, percent: 0 }
  const delayed = performanceData.delayed || { count: 0, percent: 0 }

  const items = [
    {
      label: 'On Track',
      count: onTrack.count,
      percent: onTrack.percent,
      color: '#34C99A',
      bgColor: '#ecfdf5',
    },
    {
      label: 'Before time',
      count: beforeTime.count,
      percent: beforeTime.percent,
      color: '#F5B942',
      bgColor: '#fffbeb',
    },
    {
      label: 'Delayed',
      count: delayed.count,
      percent: delayed.percent,
      color: '#EF4444',
      bgColor: '#fef2f2',
    },
  ]

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
        height: '100%',
        minHeight: '260px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#1e293b' }}>
          Performance Analysis
        </h3>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Deadline Delivery</span>
      </div>

      {/* Horizontal Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
              <span style={{ fontWeight: '700', color: '#475569' }}>{item.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({item.count} tasks)</span>
                <span style={{ fontWeight: '800', color: item.color }}>{item.percent}%</span>
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: '11px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(Math.max(item.percent, 0), 100)}%`,
                  height: '100%',
                  backgroundColor: item.color,
                  borderRadius: '6px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f1f5f9',
          marginTop: '0.5rem',
          fontSize: '0.74rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#34C99A' }} />
          <span style={{ color: '#64748b' }}>On Track: <strong>{onTrack.percent}%</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F5B942' }} />
          <span style={{ color: '#64748b' }}>Before time: <strong>{beforeTime.percent}%</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} />
          <span style={{ color: '#64748b' }}>Delayed: <strong>{delayed.percent}%</strong></span>
        </div>
      </div>
    </div>
  )
}

export default PerformanceAnalysisChart
