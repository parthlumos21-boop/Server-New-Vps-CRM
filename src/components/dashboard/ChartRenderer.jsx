import React, { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from 'recharts'
import { FaChartPie, FaChartBar, FaChartLine, FaFilter, FaFileInvoiceDollar, FaHandshake, FaBuilding, FaUser } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

const COLORS = ['#0284c7', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04']

const getEntityIcon = (entity) => {
  const norm = String(entity || '').toLowerCase().trim()
  if (norm.includes('account')) return <FaBuilding />
  if (norm.includes('deal')) return <FaHandshake />
  if (norm.includes('quotation')) return <FaFileInvoiceDollar />
  if (norm.includes('customer')) return <FaUser />
  return <FaChartPie />
}

const getChartIcon = (chartType, entity) => {
  const normType = String(chartType || '').toLowerCase().trim()
  if (normType.includes('line') || normType.includes('area')) return <FaChartLine />
  if (normType.includes('bar') || normType.includes('stack')) return <FaChartBar />
  if (normType.includes('funnel')) return <FaFilter />
  if (normType.includes('pie') || normType.includes('donut')) return <FaChartPie />
  return getEntityIcon(entity)
}

const CustomTooltip = ({ active, payload, label, isAdmin = true, currentUser = null }) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    const rawPayload = item.payload || {}
    const ownerName = rawPayload.ownerName || rawPayload.owner || rawPayload.accountOwner || rawPayload.dealOwner || (currentUser?.name || 'My Self')
    return (
      <div className="analytics-tooltip" style={{ background: '#0f172a', color: '#ffffff', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
        <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px', borderBottom: '1px solid #334155', paddingBottom: '3px' }}>
          {label || item.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={{ color: item.color || item.fill, fontSize: '14px' }}>● </span>
          <span>{item.name || 'Count'}: </span>
          <strong>{item.value}</strong>
        </div>
        {isAdmin && ownerName ? (
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
            Owner: {ownerName}
          </div>
        ) : (!isAdmin && currentUser?.name ? (
          <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>
            Owner: {currentUser.name}
          </div>
        ) : null)}
      </div>
    )
  }
  return null
}

const ChartRenderer = ({ config = {}, data = null, loading = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAdmin } = useAuth()
  const cardRef = useRef(null)

  const chartType = config.chartType || config.type || 'Pie'
  const title = config.title || config.name || 'Analytics Chart'
  const entity = config.entity || config.context || 'Metrics'

  const labels = data?.labels || []
  const values = data?.values || []
  const chartItems = data?.data || labels.map((label, index) => ({ name: label, value: values[index] || 0 }))

  const totalVal = chartItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0)

  const handleChartClick = (entry, customEntity) => {
    const normEntity = String(customEntity || entity || '').toLowerCase()
    const isAdminPath = location.pathname.startsWith('/admin')
    const prefix = isAdminPath ? '/admin' : ''
    const stageName = entry?.name ? String(entry.name).toLowerCase() : 'new'
    const stageParam = encodeURIComponent(stageName)

    if (normEntity.includes('account') || chartType === 'Funnel') {
      navigate(`${prefix}/accounts/my-accounts?stage=${stageParam}&page=1`)
    } else if (normEntity.includes('deal')) {
      navigate(`${prefix}/deals/view`)
    } else if (normEntity.includes('quotation')) {
      navigate(`${prefix}/quotation-manager/view`)
    } else if (normEntity.includes('customer')) {
      navigate(`${prefix}/customers/my-customers`)
    } else {
      navigate(`${prefix}/accounts/my-accounts?stage=new&page=1`)
    }
  }

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
                onClick={(entry) => handleChartClick(entry, entity)}
                style={{ cursor: 'pointer' }}
              >
                {chartItems.map((entry, index) => (
                  <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip isAdmin={isAdmin} currentUser={user} />} />
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
              <Tooltip content={<CustomTooltip isAdmin={isAdmin} currentUser={user} />} />
              <Bar dataKey="value" name="Total" radius={[6, 6, 0, 0]} onClick={(entry) => handleChartClick(entry, entity)} style={{ cursor: 'pointer' }}>
                {chartItems.map((entry, index) => (
                  <Cell key={`bar-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
      case 'Line':
      case 'Area': {
        const isArea = chartType === 'Area'
        return (
          <ResponsiveContainer width="100%" height={240}>
            {isArea ? (
              <AreaChart data={chartItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip isAdmin={isAdmin} currentUser={user} />} />
                <Area type="monotone" dataKey="value" name="Total" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#chartAreaGrad)" />
              </AreaChart>
            ) : (
              <LineChart data={chartItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip isAdmin={isAdmin} currentUser={user} />} />
                <Line type="monotone" dataKey="value" name="Total" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )
      }
      case 'Funnel': {
        const FUNNEL_COLORS = ['#3f63aa', '#e58634', '#469b3a', '#e14b4b', '#8b5cf6']

        return (
          <div className="analytics-vertical-funnel" style={{ padding: '12px 8px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
            {chartItems.map((item, index) => {
              const val = Number(item.value) || 0
              const widthPct = Math.max(34, 100 - index * 16)
              const color = FUNNEL_COLORS[index % FUNNEL_COLORS.length] || COLORS[index % COLORS.length]
              const percent = totalVal > 0 ? Math.round((val / totalVal) * 100) : 0

              return (
                <div
                  key={item.name || index}
                  onClick={() => handleChartClick(item, entity)}
                  title={`${item.name}: ${val} records (${percent}%)`}
                  style={{
                    width: `${widthPct}%`,
                    minWidth: '180px',
                    minHeight: index === chartItems.length - 1 ? '54px' : '64px',
                    background: color,
                    clipPath: 'polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)',
                    padding: '0 18px',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    margin: '0 auto',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.25, textShadow: '0 1px 2px rgba(0,0,0,0.28)' }}>
                    {item.name}: {val}
                  </span>
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
              <div
                key={item.name}
                onClick={() => handleChartClick(item, entity)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', textAlign: 'center', cursor: 'pointer' }}
              >
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

  const collectionName = data?.collectionName || (
    entity.toLowerCase().includes('account') ? 'leads' :
    entity.toLowerCase().includes('deal') ? 'deals' :
    entity.toLowerCase().includes('customer') ? 'customers' :
    entity.toLowerCase().includes('quotation') ? 'quotations' :
    entity.toLowerCase().includes('sr') ? 'support_requests' : 'data'
  )

  const handleDownloadCSV = (event) => {
    event.stopPropagation()
    const rows = [['Category / Stage', 'Count']]
    chartItems.forEach((item) => {
      rows.push([`"${String(item.name || '').replace(/"/g, '""')}"`, item.value])
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${String(title).toLowerCase().replace(/\s+/g, '_')}_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadExcel = (event) => {
    event.stopPropagation()
    const rows = [
      ['Report Title', `"${String(title).replace(/"/g, '""')}"`],
      ['Entity Context', entity],
      ['Collection', collectionName],
      ['Total Metric Count', totalVal],
      [],
      ['Category / Stage', 'Count', 'Percentage']
    ]
    chartItems.forEach((item) => {
      const val = Number(item.value) || 0
      const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) + '%' : '0%'
      rows.push([`"${String(item.name || '').replace(/"/g, '""')}"`, val, `"${pct}"`])
    })
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${String(title).toLowerCase().replace(/\s+/g, '_')}_report.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadPNG = (event) => {
    event.stopPropagation()
    try {
      const cardEl = cardRef.current
      if (!cardEl) return
      const svgEl = cardEl.querySelector('svg')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const width = cardEl.offsetWidth || 500
      const height = cardEl.offsetHeight || 300
      canvas.width = width * 2
      canvas.height = height * 2
      ctx.scale(2, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      if (svgEl) {
        const xml = new XMLSerializer().serializeToString(svgEl)
        const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)
        const img = new Image()
        img.onload = () => {
          ctx.fillStyle = '#0f172a'
          ctx.font = 'bold 14px sans-serif'
          ctx.fillText(title, 16, 24)
          ctx.drawImage(img, 10, 36, width - 20, height - 46)
          URL.revokeObjectURL(url)
          const a = document.createElement('a')
          a.download = `${String(title).toLowerCase().replace(/\s+/g, '_')}_snapshot.png`
          a.href = canvas.toDataURL('image/png')
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }
        img.src = url
      } else {
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 16px sans-serif'
        ctx.fillText(title, 20, 30)
        ctx.font = '12px sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.fillText(`Entity: ${entity} | Total: ${totalVal}`, 20, 50)

        let y = 80
        const funnelColors = ['#3f63aa', '#e58634', '#469b3a', '#e14b4b', '#8b5cf6']
        chartItems.forEach((item, idx) => {
          const itemVal = Number(item.value) || 0
          const barWidth = Math.max(20, (itemVal / (totalVal || 1)) * (width - 160))
          ctx.fillStyle = funnelColors[idx % funnelColors.length]
          ctx.fillRect(20, y, barWidth, 24)
          ctx.fillStyle = '#0f172a'
          ctx.font = '500 12px sans-serif'
          ctx.fillText(`${item.name}: ${itemVal}`, barWidth + 30, y + 16)
          y += 34
        })

        const a = document.createElement('a')
        a.download = `${String(title).toLowerCase().replace(/\s+/g, '_')}_snapshot.png`
        a.href = canvas.toDataURL('image/png')
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Failed to export PNG snapshot:', err)
    }
  }

  return (
    <article ref={cardRef} className="analytics-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
      <div className="analytics-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#0284c7' }}>
            {getChartIcon(chartType, entity)}
          </span>
          {title}
        </h3>
        <div className="analytics-card-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {entity} ({collectionName}) ({totalVal})
          </span>
        </div>
      </div>
      <div className="analytics-chart-body">
        {renderContent()}
      </div>
    </article>
  )
}

export default ChartRenderer

