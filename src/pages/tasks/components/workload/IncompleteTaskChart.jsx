import React, { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

const STATUS_COLORS = [
  '#a78bfa', // Purple (Pending)
  '#fbbf24', // Amber (In Progress)
  '#f87171', // Coral (Need Approval)
  '#34d399', // Mint (All From Client)
  '#60a5fa', // Blue
  '#4ade80', // Green
  '#f472b6', // Pink
  '#c084fc', // Violet
  '#38bdf8', // Sky
  '#fb923c', // Orange
]

export const IncompleteTaskChart = ({
  statusDistribution = [],
  priorityDistribution = {},
  projectDistribution = [],
  onBarClick,
}) => {
  const [activeGrouping, setActiveGrouping] = useState('status') // 'status' | 'priority' | 'project'

  // Prepare chart data based on activeGrouping
  let chartData = []
  if (activeGrouping === 'status') {
    chartData = statusDistribution.map((item, idx) => ({
      name: item.status,
      count: item.count,
      color: STATUS_COLORS[idx % STATUS_COLORS.length],
    }))
  } else if (activeGrouping === 'priority') {
    chartData = [
      { name: 'Low Priority', count: priorityDistribution.low || 0, color: '#34C99A' },
      { name: 'Medium Priority', count: priorityDistribution.medium || 0, color: '#F5B942' },
      { name: 'High Priority', count: priorityDistribution.high || 0, color: '#EF4444' },
    ]
  } else {
    // Project
    chartData = (projectDistribution.length > 0 ? projectDistribution : [{ project: 'General Tasks', count: 0 }])
      .slice(0, 10)
      .map((item, idx) => ({
        name: item.project.length > 18 ? `${item.project.slice(0, 15)}...` : item.project,
        fullName: item.project,
        count: item.count,
        color: STATUS_COLORS[idx % STATUS_COLORS.length],
      }))
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0]
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
          <div style={{ fontWeight: '800', color: '#1e293b' }}>
            {p.payload.fullName || p.payload.name}
          </div>
          <div style={{ color: p.payload.color, marginTop: '2px', fontWeight: '700' }}>
            Outstanding: {p.value} tasks
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
        gap: '0.85rem',
      }}
    >
      {/* Chart Header & Grouping Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#1e293b' }}>
            Incompleted Task Analysis
          </h3>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Outstanding Work Distribution</span>
        </div>

        {/* Sub-Tab Grouping Pills */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '2px',
            border: '1px solid #cbd5e1',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveGrouping('status')}
            style={{
              padding: '0.22rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: activeGrouping === 'status' ? '800' : '600',
              color: activeGrouping === 'status' ? '#ffffff' : '#64748b',
              backgroundColor: activeGrouping === 'status' ? '#c60016' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            By Status
          </button>
          <button
            type="button"
            onClick={() => setActiveGrouping('priority')}
            style={{
              padding: '0.22rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: activeGrouping === 'priority' ? '800' : '600',
              color: activeGrouping === 'priority' ? '#ffffff' : '#64748b',
              backgroundColor: activeGrouping === 'priority' ? '#c60016' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            By Priority
          </button>
          <button
            type="button"
            onClick={() => setActiveGrouping('project')}
            style={{
              padding: '0.22rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: activeGrouping === 'project' ? '800' : '600',
              color: activeGrouping === 'project' ? '#ffffff' : '#64748b',
              backgroundColor: activeGrouping === 'project' ? '#c60016' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            By Project
          </button>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div style={{ width: '100%', height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -20, bottom: 25 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload.length && onBarClick) {
                onBarClick(e.activePayload[0].payload)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={35}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={45}>
              {chartData.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.color} cursor="pointer" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default IncompleteTaskChart
