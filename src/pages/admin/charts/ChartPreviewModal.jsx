import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import Modal from '../../../components/common/Modal'
import { customerService } from '../../../services/customerService'
import { useData } from '../../../context/DataContext'
import './ChartsPage.css'

const PIE_COLORS = ['#3a5a99', '#4d77b8', '#6c97d3', '#8ab2e1', '#a8c5e8', '#c0d5ed', '#d8e4f1']
const CHART_GRID_STROKE = 'var(--chart-grid-stroke, #e2e8f0)'
const CHART_AXIS_STROKE = 'var(--chart-axis-stroke, #5a6b7d)'
const CHART_SLICE_STROKE = 'var(--chart-slice-stroke, #ffffff)'
const CHART_LABEL_FILL = 'var(--chart-label-fill, #ffffff)'
const CHART_TOOLTIP_CURSOR = 'rgba(75, 184, 232, 0.14)'

const guessChartContext = (chart) => {
  if (chart.context) return chart.context
  const t = (chart.title || '').toLowerCase()
  if (t.includes('enquiry') || t.includes('account')) return 'Account'
  if (t.includes('customer')) return 'Customer'
  if (t.includes('sr') || t.includes('support')) return 'SR'
  if (t.includes('deal')) return 'Deal'
  return 'Account'
}

const CATEGORY_CONTEXT_MAP = {
  Accounts: 'Account',
  Customers: 'Customer',
  SR: 'SR',
  Deals: 'Deal',
}

const guessClassificationField = (chart) => {
  if (chart.classificationField) return chart.classificationField
  const t = (chart.title || '').toLowerCase()
  if (t.includes('enquiry from')) return 'Lead Source'
  if (t.includes('status')) return 'Status'
  if (t.includes('owner') || t.includes('by')) return 'Owner'
  if (t.includes('type') || t.includes('category')) return 'Type'
  return 'Status'
}

const firstValue = (record, keys = []) => {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

const getRecordFieldValue = (record, field, context) => {
  const normalizedField = String(field || '').toLowerCase()

  if (normalizedField.includes('source') || normalizedField.includes('enquiry from')) {
    return firstValue(record, ['leadSource', 'source', 'accountSource', 'customerSource'])
  }

  if (normalizedField.includes('status')) {
    return firstValue(record, [
      context === 'Account' ? 'accountStatus' : '',
      context === 'Customer' ? 'customerStatus' : '',
      'status',
      'stage',
      'stageLabel',
    ].filter(Boolean))
  }

  if (normalizedField.includes('owner') || normalizedField.includes('by')) {
    return firstValue(record, [
      'ownerName',
      'dealOwner',
      'accountOwner',
      'customerOwner',
      'addedByName',
      'createdByName',
      'addedBy',
      'owner',
    ])
  }

  if (normalizedField.includes('request type')) {
    return firstValue(record, ['requestType', 'serviceType', 'type'])
  }

  if (normalizedField.includes('type') || normalizedField.includes('category')) {
    return firstValue(record, [
      'type',
      'category',
      'accountType',
      'customerType',
      'accountCategory',
      'customerCategory',
      'productCategory',
      'dealType',
    ])
  }

  if (normalizedField.includes('industry')) {
    return firstValue(record, ['industryType', 'industry'])
  }

  if (normalizedField.includes('consultant')) {
    return firstValue(record, ['consultantName', 'consultant'])
  }

  const possibleKey = String(field || '')
    .replace(/[./]/g, '')
    .replace(/\s+(\w)/g, (_, character) => character.toUpperCase())
    .replace(/^\w/, (character) => character.toLowerCase())

  return firstValue(record, [possibleKey, field])
}

const ChartPreviewModal = ({ isOpen, onClose, chart, category }) => {
  const { accounts, deals, supportRequests } = useData()
  const [customers, setCustomers] = useState(() => customerService.getCustomers())

  useEffect(() => {
    if (!isOpen) return undefined

    const unsubscribe = customerService.subscribe((nextCustomers) => setCustomers([...nextCustomers]))
    customerService.loadCustomers()
      .then((nextCustomers) => setCustomers([...nextCustomers]))
      .catch(() => setCustomers([...customerService.getCustomers()]))

    return unsubscribe
  }, [isOpen])
  
  const data = useMemo(() => {
    if (!chart) return []
    
    const context = chart.context || CATEGORY_CONTEXT_MAP[category] || guessChartContext(chart)
    const cf = guessClassificationField(chart)

    let records = []
    if (context === 'Account') records = accounts
    else if (context === 'Customer') records = customers
    else if (context === 'SR') records = supportRequests
    else if (context === 'Deal') records = deals

    const counts = records.reduce((acc, record) => {
      let val = getRecordFieldValue(record, cf, context)
      
      val = val || 'Unassigned'
      acc[val] = (acc[val] || 0) + 1
      return acc
    }, {})

    let result = Object.entries(counts).map(([name, value]) => ({ name, value }))
    if (chart.chartOrderBy === 'Sequence') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      result.sort((a, b) => b.value - a.value)
    }
    return result
  }, [chart, accounts, customers, supportRequests, deals])

  const renderChart = () => {
    if (!chart) return null
    if (data.length === 0) return <div style={{ padding: '2rem', textAlign: 'center' }}>No data available.</div>

    switch (chart.type) {
      case 'Card':
        return (
          <div className="cc-card-preview" style={{ flexWrap: 'wrap' }}>
            {data.map((item) => (
              <div key={item.name} className="cc-card-tile" style={{ minWidth: '120px' }}>
                <div className="cc-card-tile-value">{item.value}</div>
                <div className="cc-card-tile-label">{item.name}</div>
              </div>
            ))}
          </div>
        )
      case 'Bar':
      case 'Stack':
        return (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS_STROKE }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_AXIS_STROKE }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: CHART_TOOLTIP_CURSOR }} />
              <Bar dataKey="value" fill="#3a78bf" />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'Pie':
        return (
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={120} stroke={CHART_SLICE_STROKE} strokeWidth={1} label>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      case 'Donut':
        const total = data.reduce((acc, curr) => acc + curr.value, 0)
        return (
          <div className="cc-donut-preview" style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={90} outerRadius={120} stroke={CHART_SLICE_STROKE} strokeWidth={2} label>
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="cc-donut-center" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div className="cc-donut-center-title">Total</div>
              <div className="cc-donut-center-value">{total}</div>
            </div>
          </div>
        )
      case 'Funnel':
        return (
          <ResponsiveContainer width="100%" height={360}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={data} isAnimationActive>
                <LabelList position="center" fill={CHART_LABEL_FILL} stroke="none" dataKey="name" formatter={(name) => {
                  const entry = data.find((item) => item.name === name)
                  return entry ? `${entry.name}: ${entry.value}` : name
                }} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        )
      default:
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Unsupported chart type: {chart.type}</div>
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={chart?.title || 'Chart Preview'}
      size="large"
    >
      <div className="cc-chart-preview-modal-body">
        {renderChart()}
      </div>
    </Modal>
  )
}

export default ChartPreviewModal
