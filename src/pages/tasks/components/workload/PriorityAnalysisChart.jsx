import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

export const PriorityAnalysisChart = ({ priorityData = {}, onSelectPriority }) => {
  const low = priorityData.low || 0
  const medium = priorityData.medium || 0
  const high = priorityData.high || 0
  const total = low + medium + high

  const data = [
    { name: 'Low', value: low, color: '#34C99A' },
    { name: 'Medium', value: medium, color: '#F5B942' },
    { name: 'High', value: high, color: '#EF4444' },
  ].filter((d) => d.value > 0)

  // Fallback if zero tasks
  const chartData = data.length > 0 ? data : [{ name: 'No Tasks', value: 1, color: '#e2e8f0' }]

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0]
      const percent = total > 0 ? Math.round((p.value / total) * 100) : 0
      return (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '0.74rem',
          }}
        >
          <div style={{ fontWeight: '800', color: p.payload.color }}>{p.name} Priority</div>
          <div style={{ color: '#334155', marginTop: '2px' }}>
            Count: <strong>{p.value}</strong> ({percent}%)
          </div>
        </div>
      )
    }
    return null
  }

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#1e293b' }}>
          Priority Analysis
        </h3>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Live Distribution</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        {/* Left Stats Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', minWidth: '105px' }}>
          <div
            onClick={() => onSelectPriority && onSelectPriority('low')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: onSelectPriority ? 'pointer' : 'default' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34C99A', flexShrink: 0 }} />
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>Low</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>{low}</span>
          </div>

          <div
            onClick={() => onSelectPriority && onSelectPriority('medium')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: onSelectPriority ? 'pointer' : 'default' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F5B942', flexShrink: 0 }} />
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>Medium</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>{medium}</span>
          </div>

          <div
            onClick={() => onSelectPriority && onSelectPriority('high')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: onSelectPriority ? 'pointer' : 'default' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444', flexShrink: 0 }} />
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>High</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>{high}</span>
          </div>
        </div>

        {/* Donut Chart with Center Total */}
        <div style={{ flex: 1, height: '170px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={chartData}
                innerRadius={48}
                outerRadius={70}
                paddingAngle={data.length > 1 ? 4 : 0}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Total Count Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e293b', lineHeight: 1 }}>
              {total}
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
              Tasks
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PriorityAnalysisChart
