import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowLeft, FaArrowRight, FaCheck, FaClock, FaCog,
  FaFilter, FaGripVertical, FaHandPointRight, FaInfoCircle, FaLayerGroup,
  FaPlus, FaTimes, FaTrash,
} from 'react-icons/fa'
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
} from 'recharts'
import { useData } from '../../../context/DataContext'
import { appendUserChart, mapContextToCategory } from '../../../features/adminCharts/chartStorage'
import './ChartsPage.css'

const STEPS = [
  { num: 1, label: 'Context with Chart Type' },
  { num: 2, label: 'Choose Classification' },
  { num: 3, label: 'Additional Filters' },
  { num: 4, label: 'View Fields' },
]

const CONTEXTS = ['Account', 'Customer', 'SR', 'Deal']
const CHART_TYPES = ['Pie', 'Donut', 'Funnel', 'Bar', 'Stack', 'Card']
const AGGREGATE_TYPES = ['Count', 'Sum']

const CONTEXT_LABELS = {
  Account: 'Account',
  Customer: 'Customer',
  SR: 'Support Request',
  Deal: 'Deal',
}

const CARD_PREVIEW_ITEMS = [
  { label: 'Designing', value: 70 },
  { label: 'Coding', value: 15 },
  { label: 'SEO', value: 10 },
  { label: 'Other', value: 5 },
]

const BAR_PREVIEW_DATA = [
  { year: 2005, a: 110, b: 80, c: 90, d: 100 },
  { year: 2006, a: 170, b: 150, c: 200, d: 180 },
  { year: 2007, a: 230, b: 180, c: 250, d: 240 },
  { year: 2008, a: 300, b: 220, c: 180, d: 240 },
  { year: 2009, a: 250, b: 180, c: 130, d: 200 },
  { year: 2010, a: 320, b: 240, c: 180, d: 220 },
  { year: 2011, a: 480, b: 350, c: 290, d: 320 },
  { year: 2012, a: 380, b: 270, c: 260, d: 260 },
  { year: 2013, a: 460, b: 340, c: 230, d: 280 },
  { year: 2014, a: 420, b: 350, c: 250, d: 360 },
]

const PIE_PREVIEW_DATA = [
  { name: 'A', value: 40 },
  { name: 'B', value: 18 },
  { name: 'C', value: 14 },
  { name: 'D', value: 12 },
  { name: 'E', value: 9 },
  { name: 'F', value: 5 },
  { name: 'G', value: 2 },
]

const PIE_COLORS = ['#f4ce46', '#69b1e0', '#d04848', '#7dc15c', '#9b6dd1', '#a08b3f', '#90a4a7']
const CHART_GRID_STROKE = 'var(--chart-grid-stroke, #e2e8f0)'
const CHART_AXIS_STROKE = 'var(--chart-axis-stroke, #5a6b7d)'
const CHART_SLICE_STROKE = 'var(--chart-slice-stroke, #ffffff)'
const CHART_LABEL_FILL = 'var(--chart-label-fill, #ffffff)'
const CHART_TOOLTIP_CURSOR = 'rgba(75, 184, 232, 0.14)'

const FUNNEL_PREVIEW_DATA = [
  { name: 'Status 4', value: 350, fill: '#3a5a99' },
  { name: 'Status 1', value: 300, fill: '#dd863a' },
  { name: 'Status 3', value: 200, fill: '#4a9a3b' },
  { name: 'Status 2', value: 100, fill: '#cf3d3d' },
]

const CONTEXT_FIELDS = {
  Account: [
    'Account No.', 'Account Name', 'Added Date', 'Account Category', 'Account Owner',
    'Account Status', 'Contact Person', 'Email', 'Phone', 'Address', 'Account Type',
    'Industry Type', 'GSTIN', 'State Code', 'Added By',
  ],
  Customer: [
    'Customer No.', 'Customer Name', 'Added Date', 'Customer Category', 'Customer Owner',
    'Customer Status', 'Contact Person', 'Email', 'Phone', 'Address', 'Customer Type',
    'Product Category', 'Designation', 'Project Name', 'State', 'Industry Type',
    'GSTIN', 'State Code', 'Added By',
  ],
  SR: [
    'SR Number', 'SR Title', 'Added Date', 'Status', 'Priority', 'SR Owner', 'Customer Name',
    'Category', 'Sub Category', 'Description', 'Resolution', 'Added By',
  ],
  Deal: [
    'Deal No.', 'Customer Name', 'Deal Date', 'Deal Type', 'Deal Name', 'Deal Owner',
    'Deal Co-Owners', 'Deal Status', 'Address', 'Last Updated', 'Latest Remark', 'Deal Value',
    'Job No', 'Project Name', 'Consultant Name',
  ],
}

const STAFF_OPTIONS = [
  'Atish Shah', 'Bhavesh Prajapati', 'Hasmukh Chauhan', 'Jagruti Parmar',
  'Jay Pandya', 'Kanu Shah', 'Keval V Shah', 'Krunal patel',
  'Monali Pataliya', 'Naim Vhora', 'Nita Bhavsar', 'Rajeshree Parmar',
  'Samir Jha', 'Samir Sheth', 'Support Swati', 'Tajamul Rafique Solkar', 'Vaibhavi Patel',
]

const CLASSIFICATION_FIELDS_BY_CONTEXT = {
  Account: ['Account Category', 'Account Owner', 'Account Status', 'Account Type', 'Industry Type', 'Added By'],
  Customer: ['Customer Category', 'Customer Owner', 'Customer Status', 'Customer Type', 'Product Category', 'Industry Type', 'Added By'],
  SR: ['Request Type', 'Owner', 'Status', 'Under Warranty', 'Added By'],
  Deal: ['Deal Status', 'Deal Owner', 'Deal Co-Owners', 'Deal Type', 'Consultant Name', 'Added By'],
}

const CLASSIFICATION_OPTIONS_BY_FIELD = {
  'Customer Category': ['MARKETING-LUMOS', 'MARKETING-SWATI', 'CHANNEL', 'DIRECT', 'OEM'],
  'Customer Owner': STAFF_OPTIONS,
  'Customer Status': ['New', 'Active', 'Inactive', 'Lost'],
  'Customer Type': ['Consultant', 'Contractor', 'End-User', 'Internal Lead', 'OEM', 'Project Manager'],
  'Product Category': ['Audio-Video', 'Automation', 'Busduct', 'C&R Panel', 'HT', 'HT & LT', 'LT'],
  'Industry Type': [
    'Automotives', 'Cement and Mining', 'Ceramic & Tiles', 'Commercial', 'Dairy',
    'Dairy & Dairy Machinery', 'Datacenter', 'Engineering', 'Food & Beverages',
    'Government (PSU)', 'Hospitality', 'IT', 'Infrastructure', 'Metal & Tube',
    'Paint & Chemicals', 'Paper and Cement', 'Pharma & Laboratory', 'Power Generation',
    'Print & Packaging', 'Pumping Stations', 'Residential', 'SEZ & Ports', 'Water Segment',
  ],
  'Added By': STAFF_OPTIONS,
  'Account Category': ['Direct', 'Channel', 'OEM'],
  'Account Owner': STAFF_OPTIONS,
  'Account Status': ['Active', 'Inactive', 'Lead'],
  'Account Type': ['B2B', 'B2C'],
  'Status': ['Active', 'Attending', 'On Site', 'In Progress', 'On Hold', 'Postponed'],
  'Priority': ['Low', 'Medium', 'High', 'Critical'],
  'Owner': STAFF_OPTIONS,
  'Request Type': [
    'Commissioning Support', 'Component Burned or Malfunctioning', 'Others',
    'Painting Issue', 'Parameter Setting', 'Retrofitting Job-Old to New', 'Short Material',
  ],
  'Under Warranty': ['YES', 'NO'],
  'Category': ['Bug', 'Feature', 'Support'],
  'Sub Category': ['UI', 'Backend', 'Database'],
  'Deal Status': ['New', 'Closed-Won', 'Closed-Lost', 'Quotation Sent', 'Quotation Revision'],
  'Deal Owner': STAFF_OPTIONS,
  'Deal Co-Owners': STAFF_OPTIONS,
  'Deal Type': ['MARKETING-SWATI', 'CHANNEL', 'OEM'],
  'Consultant Name': ['Internal', 'External'],
  'Converted By': STAFF_OPTIONS,
}

const CHART_ORDER_BY_OPTIONS = ['Sequence', 'Count']

const TIME_FILTER_FIELDS = ['Added Date', 'Last Updated']
const TIME_FILTER_PERIODS = [
  'This Month', 'Last Month', 'Last 90 Days', 'Last Year', 'This Year',
  'This Week', 'Last Week', 'Between', 'Today', 'Yesterday',
]

const ACTIONS_BY_CONTEXT = {
  Account: ['View Account', 'Manage Account', 'Add Remark', 'Re-Assign Account', 'Add Reminder', 'Change Status', 'Send Mail'],
  Customer: ['View Customer', 'Manage Customer', 'Add Remark', 'Re-Assign Customer', 'Add Reminder', 'Change Status', 'Send Mail'],
  SR: ['View SR', 'Manage SR', 'Add Remark', 'Re-Assign SR', 'Add Reminder', 'Change Status', 'Send Mail'],
  Deal: ['View Deal', 'Manage Deal', 'Add Remark', 'Re-Assign Deal', 'Add Reminder', 'Change Status', 'Send Mail'],
}

const ATTRIBUTES_HEADER_BY_CONTEXT = {
  Account: 'Account Attributes',
  Customer: 'Customer Attributes',
  SR: 'SR Attributes',
  Deal: 'Deal Attributes',
}

const createFilterRow = () => ({
  id: `filter-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`,
  fieldKey: '',
  operator: '',
  value: '',
  negated: false,
})

const ChartsPage = ({ basePath = '/admin/charts' }) => {
  const navigate = useNavigate()
  const { addNotification } = useData()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedContext, setSelectedContext] = useState('Customer')
  const [selectedChartType, setSelectedChartType] = useState('Pie')
  const [selectedAggregateType, setSelectedAggregateType] = useState(null)

  // Step 2
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [classificationField, setClassificationField] = useState('')
  const [classificationOptions, setClassificationOptions] = useState({})
  const [chartOrderBy, setChartOrderBy] = useState('Count')

  // Step 3
  const [timeFilterEnabled, setTimeFilterEnabled] = useState(false)
  const [timeFilterField, setTimeFilterField] = useState('Added Date')
  const [timeFilterPeriod, setTimeFilterPeriod] = useState('')
  const [additionalFiltersEnabled, setAdditionalFiltersEnabled] = useState(false)
  const [filterRows, setFilterRows] = useState([createFilterRow()])

  // Step 4
  const [selectedActionKeys, setSelectedActionKeys] = useState([])
  const [orderByEnabled, setOrderByEnabled] = useState(false)
  const [orderByField, setOrderByField] = useState('')
  const [selectedFieldKeys, setSelectedFieldKeys] = useState([])
  const [draggedFieldKey, setDraggedFieldKey] = useState('')

  const contextFields = CONTEXT_FIELDS[selectedContext] || []
  const classificationFieldOptions = CLASSIFICATION_FIELDS_BY_CONTEXT[selectedContext] || []
  const classificationCurrentOptions = classificationField
    ? (CLASSIFICATION_OPTIONS_BY_FIELD[classificationField] || [])
    : []
  const actionsList = ACTIONS_BY_CONTEXT[selectedContext] || []
  const attributesHeader = ATTRIBUTES_HEADER_BY_CONTEXT[selectedContext] || 'Attributes'

  const availableFieldKeys = useMemo(
    () => contextFields.filter((field) => !selectedFieldKeys.includes(field)),
    [contextFields, selectedFieldKeys]
  )

  const handleNext = () => {
    if (currentStep < STEPS.length) setCurrentStep((s) => s + 1)
  }
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1)
  }

  const handleSelectClassificationField = (value) => {
    setClassificationField(value)
    if (value && !classificationOptions[value]) {
      const options = CLASSIFICATION_OPTIONS_BY_FIELD[value] || []
      setClassificationOptions((current) => ({
        ...current,
        [value]: options.reduce((accumulator, option) => ({ ...accumulator, [option]: true }), {}),
      }))
    }
  }

  const handleToggleClassificationOption = (option) => {
    setClassificationOptions((current) => {
      const fieldState = current[classificationField] || {}
      return {
        ...current,
        [classificationField]: { ...fieldState, [option]: !fieldState[option] },
      }
    })
  }

  const handleToggleAllClassificationOptions = () => {
    setClassificationOptions((current) => {
      const fieldState = current[classificationField] || {}
      const allOn = classificationCurrentOptions.every((option) => fieldState[option])
      const next = classificationCurrentOptions.reduce((accumulator, option) => ({ ...accumulator, [option]: !allOn }), {})
      return { ...current, [classificationField]: next }
    })
  }

  const handleUpdateFilterRow = (rowId, updates) => {
    setFilterRows((current) => current.map((row) => row.id === rowId ? { ...row, ...updates } : row))
  }

  const handleAddFilterRow = () => {
    setFilterRows((current) => [...current, createFilterRow()])
  }

  const handleRemoveFilterRow = (rowId) => {
    setFilterRows((current) => current.length <= 1 ? [createFilterRow()] : current.filter((row) => row.id !== rowId))
  }

  const handleToggleAction = (action) => {
    setSelectedActionKeys((current) => (
      current.includes(action) ? current.filter((entry) => entry !== action) : [...current, action]
    ))
  }

  const handleAddFieldToSelection = (field) => {
    setSelectedFieldKeys((current) => current.includes(field) ? current : [...current, field])
  }

  const handleRemoveFieldFromSelection = (field) => {
    setSelectedFieldKeys((current) => current.filter((entry) => entry !== field))
  }

  const handleReorderSelectedField = (sourceField, targetField) => {
    if (!sourceField || !targetField || sourceField === targetField) return
    setSelectedFieldKeys((current) => {
      const next = [...current]
      const sourceIndex = next.indexOf(sourceField)
      const targetIndex = next.indexOf(targetField)
      if (sourceIndex === -1 || targetIndex === -1) return current
      next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, sourceField)
      return next
    })
  }

  const handleFinish = () => {
    const category = mapContextToCategory(selectedContext)
    const trimmedTitle = title.trim() || 'Untitled chart'
    if (category) {
      appendUserChart(category, {
        id: `chart-user-${Date.now()}`,
        title: trimmedTitle,
        type: selectedChartType || 'Card',
        mobileEnabled: false,
        active: true,
        context: selectedContext,
        classificationField,
        classificationOptions,
        chartOrderBy,
        timeFilterEnabled,
        timeFilterField,
        timeFilterPeriod,
        additionalFiltersEnabled,
        filterRows,
        selectedActionKeys,
        orderByEnabled,
        orderByField,
        selectedFieldKeys,
      })
    }
    addNotification('success', 'Chart Created', `"${trimmedTitle}" was saved successfully.`)
    navigate(basePath, { state: { newChartCategory: category } })
  }

  const renderChartPreview = () => {
    switch (selectedChartType) {
      case 'Card':
        return (
          <div className="cc-card-preview">
            {CARD_PREVIEW_ITEMS.map((item) => (
              <div key={item.label} className="cc-card-tile">
                <div className="cc-card-tile-value">{item.value}</div>
                <div className="cc-card-tile-label">{item.label}</div>
              </div>
            ))}
          </div>
        )
      case 'Bar':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={BAR_PREVIEW_DATA} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART_AXIS_STROKE }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_AXIS_STROKE }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: CHART_TOOLTIP_CURSOR }} />
              <Bar dataKey="a" fill="#3a78bf" />
              <Bar dataKey="b" fill="#5fa1d6" />
              <Bar dataKey="c" fill="#9bb8ce" />
              <Bar dataKey="d" fill="#5fae5f" />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'Stack':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={BAR_PREVIEW_DATA} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART_AXIS_STROKE }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_AXIS_STROKE }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: CHART_TOOLTIP_CURSOR }} />
              <Bar dataKey="a" stackId="s" fill="#3a78bf" />
              <Bar dataKey="b" stackId="s" fill="#5fa1d6" />
              <Bar dataKey="c" stackId="s" fill="#9bb8ce" />
              <Bar dataKey="d" stackId="s" fill="#5fae5f" />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'Pie':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={PIE_PREVIEW_DATA} dataKey="value" nameKey="name" outerRadius={95} stroke={CHART_SLICE_STROKE} strokeWidth={1}>
                {PIE_PREVIEW_DATA.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      case 'Donut':
        return (
          <div className="cc-donut-preview">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={PIE_PREVIEW_DATA} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} stroke={CHART_SLICE_STROKE} strokeWidth={2}>
                  {PIE_PREVIEW_DATA.map((entry, index) => (
                    <Cell key={entry.name} fill={['#3a5a99', '#4d77b8', '#6c97d3', '#8ab2e1', '#a8c5e8', '#c0d5ed', '#d8e4f1'][index % 7]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="cc-donut-center">
              <div className="cc-donut-center-title">Designing</div>
              <div className="cc-donut-center-value">70</div>
            </div>
          </div>
        )
      case 'Funnel':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={FUNNEL_PREVIEW_DATA} isAnimationActive>
                <LabelList position="center" fill={CHART_LABEL_FILL} stroke="none" dataKey="name" formatter={(name) => {
                  const entry = FUNNEL_PREVIEW_DATA.find((item) => item.name === name)
                  return entry ? `${entry.name}: ${entry.value}` : name
                }} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        )
      default:
        return (
          <div className="cc-preview-empty">
            <span className="cc-preview-text">Choose Chart Type</span>
          </div>
        )
    }
  }

  const renderStep1 = () => (
    <div className="cc-body">
      <div className="cc-selectors">
        <div className="cc-section">
          <h2 className="cc-section-title">
            <FaHandPointRight className="cc-section-icon" />
            Choose the Context
          </h2>
          <div className="cc-btn-list">
            {CONTEXTS.map((ctx) => (
              <button
                key={ctx}
                type="button"
                className={`cc-option-btn${selectedContext === ctx ? ' cc-option-btn--selected' : ''}`}
                onClick={() => setSelectedContext(ctx)}
              >
                {ctx}
              </button>
            ))}
          </div>
        </div>

        <div className="cc-section">
          <h2 className="cc-section-title">
            <FaHandPointRight className="cc-section-icon" />
            Choose the Chart Type
          </h2>
          <div className="cc-btn-list">
            {CHART_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`cc-option-btn${selectedChartType === type ? ' cc-option-btn--selected' : ''}`}
                onClick={() => setSelectedChartType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cc-previews">
        <div className="cc-preview-card cc-preview-card-context">
          <FaLayerGroup className="cc-preview-icon" />
          <span className="cc-preview-selected-label">
            {selectedContext ? (CONTEXT_LABELS[selectedContext] || selectedContext) : 'Choose Context'}
          </span>
        </div>

        <div className="cc-preview-card cc-preview-card-chart">
          {renderChartPreview()}
        </div>

        <div className="cc-section cc-section-aggregate">
          <h2 className="cc-section-title">
            <FaHandPointRight className="cc-section-icon" />
            Choose Aggregate Type
          </h2>
          <div className="cc-btn-list">
            {AGGREGATE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`cc-option-btn${selectedAggregateType === type ? ' cc-option-btn--selected' : ''}`}
                onClick={() => setSelectedAggregateType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => {
    const classificationFieldState = classificationOptions[classificationField] || {}
    const allOn = classificationCurrentOptions.length > 0
      && classificationCurrentOptions.every((option) => classificationFieldState[option])

    return (
      <div className="cc-body cc-body-step2">
        <div className="cc-summary-grid">
          <div className="cc-summary-row">
            <span className="cc-summary-label">Context</span>
            <span className="cc-summary-value">{selectedContext}</span>
          </div>
          <div className="cc-summary-row">
            <span className="cc-summary-label">Chart Type</span>
            <span className="cc-summary-value">{selectedChartType || '-'}</span>
          </div>
          <div className="cc-summary-row">
            <label className="cc-summary-label" htmlFor="cc-title-input">
              Title <FaInfoCircle className="cc-info-icon" title="Chart title shown on dashboard" />
            </label>
            <input
              id="cc-title-input"
              type="text"
              className="cc-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter Title"
            />
          </div>
          <div className="cc-summary-row">
            <label className="cc-summary-label" htmlFor="cc-description-input">Description</label>
            <textarea
              id="cc-description-input"
              className="cc-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="cc-classification-block">
          <div className="cc-classification-header">
            <label className="cc-classification-label" htmlFor="cc-classification-select">Classification Field</label>
            <select
              id="cc-classification-select"
              className="cc-select"
              value={classificationField}
              onChange={(event) => handleSelectClassificationField(event.target.value)}
            >
              <option value="">Select</option>
              {classificationFieldOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {classificationField ? (
            <div className="cc-classification-options">
              <div className="cc-classification-options-title">
                Choose the {classificationField} to be listed in the view
              </div>

              <div className="cc-classification-master-row">
                <button
                  type="button"
                  className={`cc-toggle-pill ${allOn ? 'cc-toggle-pill-on' : 'cc-toggle-pill-off'}`}
                  onClick={handleToggleAllClassificationOptions}
                >
                  {allOn ? 'ON' : 'OFF'}
                </button>
                <span className="cc-classification-option-label cc-classification-option-label-link">Select all</span>
              </div>

              <div className="cc-classification-options-grid">
                {classificationCurrentOptions.map((option) => {
                  const isOn = Boolean(classificationFieldState[option])
                  return (
                    <div key={option} className="cc-classification-toggle-row">
                      <button
                        type="button"
                        className={`cc-toggle-pill ${isOn ? 'cc-toggle-pill-on' : 'cc-toggle-pill-off'}`}
                        onClick={() => handleToggleClassificationOption(option)}
                      >
                        {isOn ? 'ON' : 'OFF'}
                      </button>
                      <span className="cc-classification-option-label">{option}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="cc-chart-orderby-block">
          <span className="cc-chart-orderby-label">Chart Order By</span>
          <div className="cc-chart-orderby-options">
            {CHART_ORDER_BY_OPTIONS.map((option) => (
              <label key={option} className="cc-chart-orderby-radio">
                <input
                  type="radio"
                  name="cc-chart-orderby"
                  value={option}
                  checked={chartOrderBy === option}
                  onChange={() => setChartOrderBy(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderStep3 = () => (
    <div className="cc-body cc-body-step3">
      <div className={`cc-config-section ${timeFilterEnabled ? 'cc-config-section-on' : ''}`}>
        <div className="cc-config-section-head">
          <span className="cc-config-section-title">Add Time Filter</span>
          <button
            type="button"
            className={`cc-yesno-toggle ${timeFilterEnabled ? 'cc-yesno-toggle-on' : 'cc-yesno-toggle-off'}`}
            onClick={() => setTimeFilterEnabled((value) => !value)}
          >
            {timeFilterEnabled ? 'YES' : 'NO'}
          </button>
        </div>
        {timeFilterEnabled ? (
          <div className="cc-config-card">
            <div className="cc-config-card-title">
              <FaClock /> Time period
            </div>
            <div className="cc-config-card-body cc-config-card-body-grid">
              <select
                className="cc-select"
                value={timeFilterField}
                onChange={(event) => setTimeFilterField(event.target.value)}
              >
                {TIME_FILTER_FIELDS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                className="cc-select"
                value={timeFilterPeriod}
                onChange={(event) => setTimeFilterPeriod(event.target.value)}
              >
                <option value="">Select</option>
                {TIME_FILTER_PERIODS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      <div className={`cc-config-section ${additionalFiltersEnabled ? 'cc-config-section-on' : ''}`}>
        <div className="cc-config-section-head">
          <span className="cc-config-section-title">Add Additional Filters</span>
          <button
            type="button"
            className={`cc-yesno-toggle ${additionalFiltersEnabled ? 'cc-yesno-toggle-on' : 'cc-yesno-toggle-off'}`}
            onClick={() => setAdditionalFiltersEnabled((value) => !value)}
          >
            {additionalFiltersEnabled ? 'YES' : 'NO'}
          </button>
        </div>
        {additionalFiltersEnabled ? (
          <div className="cc-config-card">
            <div className="cc-config-card-title">
              <FaFilter /> Configure Filters
            </div>
            <div className="cc-config-card-body">
              {filterRows.map((row, index) => (
                <div key={row.id} className="cc-filter-row">
                  <span className="cc-filter-prefix">{index === 0 ? 'If' : 'And'}</span>
                  <select
                    className="cc-select cc-filter-field"
                    value={row.fieldKey}
                    onChange={(event) => handleUpdateFilterRow(row.id, { fieldKey: event.target.value })}
                  >
                    <option value="">Select</option>
                    {contextFields.map((field) => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                  <span className="cc-filter-is">is</span>
                  <label className="cc-filter-not">
                    <input
                      type="checkbox"
                      checked={row.negated}
                      onChange={(event) => handleUpdateFilterRow(row.id, { negated: event.target.checked })}
                    />
                    <span>not</span>
                  </label>
                  <select
                    className="cc-select cc-filter-value"
                    value={row.value}
                    onChange={(event) => handleUpdateFilterRow(row.id, { value: event.target.value })}
                  >
                    <option value="">select</option>
                    {(CLASSIFICATION_OPTIONS_BY_FIELD[row.fieldKey] || []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <button type="button" className="cc-filter-action-btn" onClick={handleAddFilterRow} aria-label="Add filter row">
                    <FaPlus />
                  </button>
                  {filterRows.length > 1 ? (
                    <button
                      type="button"
                      className="cc-filter-action-btn cc-filter-action-btn-danger"
                      onClick={() => handleRemoveFilterRow(row.id)}
                      aria-label="Remove filter row"
                    >
                      <FaTrash />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="cc-body cc-body-step4">
      <div className="cc-config-section cc-config-section-on">
        <div className="cc-config-section-head">
          <span className="cc-config-section-title cc-config-section-title-light">Actions</span>
        </div>
        <div className="cc-actions-grid">
          {actionsList.map((action) => {
            const isOn = selectedActionKeys.includes(action)
            return (
              <label key={action} className="cc-action-check">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => handleToggleAction(action)}
                />
                <span>{action}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className={`cc-config-section ${orderByEnabled ? 'cc-config-section-on' : ''}`}>
        <div className="cc-config-section-head">
          <span className="cc-config-section-title">Add Order By</span>
          <button
            type="button"
            className={`cc-yesno-toggle ${orderByEnabled ? 'cc-yesno-toggle-on' : 'cc-yesno-toggle-off'}`}
            onClick={() => setOrderByEnabled((value) => !value)}
          >
            {orderByEnabled ? 'YES' : 'NO'}
          </button>
        </div>
        {orderByEnabled ? (
          <div className="cc-config-card">
            <div className="cc-config-card-body">
              <select className="cc-select" value={orderByField} onChange={(event) => setOrderByField(event.target.value)}>
                <option value="">Select</option>
                {contextFields.map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      <div className="cc-field-selector">
        <div className="cc-field-card">
          <div className="cc-field-card-header">
            <FaCog /> {attributesHeader}
          </div>
          <div className="cc-field-list">
            {availableFieldKeys.length === 0 ? (
              <div className="cc-field-empty">All fields are already selected.</div>
            ) : (
              availableFieldKeys.map((field) => (
                <button
                  key={field}
                  type="button"
                  className="cc-field-row cc-field-row-available"
                  onClick={() => handleAddFieldToSelection(field)}
                >
                  <FaGripVertical className="cc-field-row-icon" aria-hidden="true" />
                  <span>{field}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="cc-field-card">
          <div className="cc-field-card-header">
            <FaCog /> Selected Fields
          </div>
          <div className="cc-field-list">
            {selectedFieldKeys.length === 0 ? (
              <div className="cc-field-empty">Click an attribute on the left to add it here.</div>
            ) : (
              selectedFieldKeys.map((field) => {
                const isDragging = draggedFieldKey === field
                return (
                  <div
                    key={field}
                    className={`cc-field-row cc-field-row-selected ${isDragging ? 'cc-field-row-dragging' : ''}`}
                    draggable
                    onDragStart={() => setDraggedFieldKey(field)}
                    onDragEnd={() => setDraggedFieldKey('')}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      handleReorderSelectedField(draggedFieldKey, field)
                      setDraggedFieldKey('')
                    }}
                  >
                    <FaGripVertical className="cc-field-row-icon" aria-hidden="true" />
                    <span className="cc-field-row-label">{field}</span>
                    <button
                      type="button"
                      className="cc-field-row-remove"
                      onClick={() => handleRemoveFieldFromSelection(field)}
                      aria-label={`Remove ${field}`}
                    >
                      <FaTimes />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="cc-page">
      <div className="cc-topbar">
        <h1 className="cc-topbar-title">Configure Chart</h1>
        <button
          type="button"
          className="cc-cancel-btn"
          onClick={() => navigate(basePath)}
        >
          <FaTimes /> Cancel
        </button>
      </div>

      <div className="cc-panel">
        <div className="cc-steps">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="cc-step">
              <span className={`cc-step-num ${currentStep === step.num ? 'cc-step-num--active' : ''} ${currentStep > step.num ? 'cc-step-num--done' : ''}`}>
                {currentStep > step.num ? <FaCheck /> : step.num}
              </span>
              <span className={`cc-step-label ${currentStep === step.num ? 'cc-step-label--active' : ''}`}>
                {idx > 0 && <FaArrowRight className="cc-step-arrow" aria-hidden="true" />}
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="cc-divider" />

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        <div className="cc-footer">
          <button type="button" className="cc-nav-btn" onClick={handleBack} disabled={currentStep === 1}>
            <FaArrowLeft /> Back
          </button>
          {currentStep === STEPS.length ? (
            <button type="button" className="cc-nav-btn cc-nav-btn-finish" onClick={handleFinish}>
              Finish
            </button>
          ) : (
            <button type="button" className="cc-nav-btn" onClick={handleNext}>
              Next <FaArrowRight />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChartsPage

