import React from 'react'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { FaChartPie, FaChartBar } from 'react-icons/fa'

const COLORS = ['#0284c7', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    return (
      <div className="analytics-tooltip" style={{ background: '#0f172a', color: '#ffffff', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
        <div style={{ fontWeight: 600 }}>{label || item.name}</div>
        <div style={{ marginTop: '4px' }}>
          <span style={{ color: item.color || item.fill }}>● </span>
          <span>{item.name}: </span>
          <strong>{item.value}</strong>
        </div>
      </div>
    )
  }
  return null
}

const DynamicChartWidget = ({ config = {}, data = null, loading = false }) => {
  const chartType = config.chartType || config.type || 'Pie'
  const title = config.title || config.name || 'Analytics Chart'
  const entity = config.entity || config.context || 'Metrics'

  const labels = data?.labels || []
  const values = data?.values || []
  const chartItems = data?.data || labels.map((label, index) => ({ name: label, value: values[index] || 0 }))

  const totalVal = values.reduce((sum, v) => sum + (Number(v) || 0), 0)

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: '#64748b' }}>
          Loading live chart metrics...
        </div>
      )
    }

    if (!chartItems || chartItems.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: '#94a3b8', fontSize: '13px' }}>
          No records matching filter criteria
        </div>
      )
    }

    switch (chartType) {
      case 'Donut':
      case 'Pie': {
        const isDonut = chartType === 'Donut'
        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartItems}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={isDonut ? 50 : 0}
                outerRadius={80}
                paddingAngle={4}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartItems.map((entry, index) => (
                  <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )
      }
      case 'Bar':
      case 'Stack': {
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Total" radius={[6, 6, 0, 0]}>
                {chartItems.map((entry, index) => (
                  <Cell key={`bar-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
      case 'Funnel': {
        return (
          <div style={{ padding: '12px 0' }}>
            {chartItems.map((item, index) => {
              const maxVal = Math.max(...values, 1)
              const widthPct = Math.max(15, Math.min(100, Math.round((item.value / maxVal) * 100)))
              const color = COLORS[index % COLORS.length]
              return (
                <div key={item.name} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#334155', fontWeight: 600 }}>
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '18px', overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, background: color, height: '100%', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
      case 'Card':
      default: {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', padding: '10px 0' }}>
            {chartItems.map((item, index) => (
              <div key={item.name} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: COLORS[index % COLORS.length] }}>
                  {item.value}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )
      }
    }
  }

  return (
    <article className="analytics-card" style={{ background: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0' }}>
      <div className="analytics-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#0284c7' }}>
            {chartType === 'Pie' || chartType === 'Donut' ? <FaChartPie /> : <FaChartBar />}
          </span>
          {title}
        </h3>
        <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
          {entity} ({totalVal})
        </span>
      </div>
      <div className="analytics-chart-body">
        {renderContent()}
      </div>
    </article>
  )
}

export default DynamicChartWidget
