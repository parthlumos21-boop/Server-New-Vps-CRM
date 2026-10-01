import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaArrowRight, FaInfoCircle, FaPlus, FaRegListAlt, FaSave, FaTable, FaTrash } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { REMARK_REPORT_CONTEXT_OPTIONS } from '../../../features/adminReports/remarkReportTemplateConfig'
import { saveAdminReportTemplate } from '../../../features/adminReports/reportTemplateStorage'
import ReportOutputPreview from './ReportOutputPreview'
import './AddRemarkReportPage.css'

const VISIBILITY_OPTIONS = [
  'Visible to Me Only',
  'Visible to My Group',
  'Visible to All',
  'Visible to Custom Users',
]

const OPERATORS = [
  { value: 'equals', label: 'select' },
  { value: 'not_equals', label: 'not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'between', label: 'between' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

const FIELD_GROUPS_BY_CONTEXT = {
  account: [
    {
      title: 'Remark Attributes',
      subTitle: 'Remark',
      fields: [
        { key: 'remarkAddedBy', label: 'Remark Added By' },
        { key: 'remarkAddedOn', label: 'Remark Added On' },
        { key: 'remarkType', label: 'Remark Type' },
        { key: 'remarkNote', label: 'Remark Note' },
      ],
    },
    {
      title: 'Account',
      fields: [
        { key: 'accountNumber', label: 'Account No.' },
        { key: 'accountName', label: 'Account Name' },
        { key: 'accountDate', label: 'Account Date' },
        { key: 'accountCategory', label: 'Account Category' },
        { key: 'accountOwner', label: 'Account Owner' },
        { key: 'accountStatus', label: 'Account Status' },
        { key: 'accountSource', label: 'Account Source' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'phone', label: 'Phone' },
        { key: 'countryCode', label: 'Country Code' },
        { key: 'email', label: 'Email' },
        { key: 'alternatePhone', label: 'Alternate Phone' },
        { key: 'alternateEmail', label: 'Alternate Email' },
        { key: 'customerType', label: 'Customer Type' },
        { key: 'projectName', label: 'Project Name' },
        { key: 'productCategory', label: 'Product Category' },
        { key: 'state', label: 'State' },
        { key: 'location', label: 'Location' },
        { key: 'description', label: 'Description' },
        { key: 'industryType', label: 'Industry Type' },
        { key: 'customerRefNo', label: 'Customer Ref. No.' },
        { key: 'address', label: 'Address' },
        { key: 'customerRefDate', label: 'Customer Ref. Date' },
        { key: 'consultantName', label: 'Consultant Name' },
        { key: 'poValue', label: 'PO Value' },
        { key: 'orderReceivedStatus', label: 'Status of Customer as per Order Received' },
        { key: 'quotationGivenStatus', label: 'Status Of Customer as per quotation Given' },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'stateCode', label: 'State Code' },
        { key: 'jobNo', label: 'Job No' },
        { key: 'reasonForLost', label: 'Reason For Lost' },
        { key: 'customerName', label: 'Customer Name' },
        { key: 'accountSubsource', label: 'Account Subsource' },
        { key: 'lastUpdated', label: 'Last Updated' },
        { key: 'addedBy', label: 'Added By' },
        { key: 'addedOn', label: 'Added On' },
        { key: 'ageing', label: 'Ageing' },
        { key: 'userType', label: 'User Type' },
        { key: 'userGroup', label: 'User Group' },
      ],
    },
  ],
  customer: [
    {
      title: 'Remark Attributes',
      subTitle: 'Remark',
      fields: [
        { key: 'remarkAddedBy', label: 'Remark Added By' },
        { key: 'remarkAddedOn', label: 'Remark Added On' },
        { key: 'remarkType', label: 'Remark Type' },
        { key: 'remarkNote', label: 'Remark Note' },
      ],
    },
    {
      title: 'Customer',
      fields: [
        { key: 'customerNumber', label: 'Customer No.' },
        { key: 'customerName', label: 'Customer Name' },
        { key: 'addedDate', label: 'Added Date' },
        { key: 'customerCategory', label: 'Customer Category' },
        { key: 'customerOwner', label: 'Customer Owner' },
        { key: 'customerStatus', label: 'Customer Status' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'address', label: 'Address' },
        { key: 'customerType', label: 'Customer Type' },
        { key: 'productCategory', label: 'Product Category' },
        { key: 'designation', label: 'Designation' },
        { key: 'projectName', label: 'Project Name' },
        { key: 'state', label: 'State' },
        { key: 'industryType', label: 'Industry Type' },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'stateCode', label: 'State Code' },
        { key: 'alternateEmail', label: 'Alternate Email' },
        { key: 'alternatePhone', label: 'Alternate Phone' },
        { key: 'jobNo', label: 'Job No' },
        { key: 'lastUpdated', label: 'Last Updated' },
        { key: 'addedBy', label: 'Added By' },
        { key: 'userType', label: 'User Type' },
        { key: 'userGroup', label: 'User Group' },
      ],
    },
  ],
  deal: [
    {
      title: 'Remark Attributes',
      subTitle: 'Remark',
      fields: [
        { key: 'remarkAddedBy', label: 'Remark Added By' },
        { key: 'remarkAddedOn', label: 'Remark Added On' },
        { key: 'remarkType', label: 'Remark Type' },
        { key: 'remarkNote', label: 'Remark Note' },
      ],
    },
    {
      title: 'Deal',
      fields: [
        { key: 'dealNumber', label: 'Deal No.' },
        { key: 'dealDate', label: 'Deal Date' },
        { key: 'dealType', label: 'Deal Type' },
        { key: 'dealName', label: 'Deal Name' },
        { key: 'dealOwner', label: 'Deal Owner' },
        { key: 'dealStatus', label: 'Deal Status' },
        { key: 'dealValue', label: 'Deal Value' },
        { key: 'probability', label: 'Probability' },
        { key: 'dealSource', label: 'Deal Source' },
        { key: 'description', label: 'Description' },
        { key: 'expectedClosureDate', label: 'Expected Closure Date' },
        { key: 'poValue', label: 'PO Value' },
        { key: 'currency', label: 'Currency' },
        { key: 'customerReferenceNo', label: 'Customer Reference No' },
        { key: 'reasonForLost', label: 'Reason For Lost' },
        { key: 'addedBy', label: 'Added By' },
        { key: 'addedOn', label: 'Added On' },
        { key: 'userType', label: 'User Type' },
        { key: 'userGroup', label: 'User Group' },
      ],
    },
  ],
  sr: [
    {
      title: 'Remark Attributes',
      subTitle: 'Remark',
      fields: [
        { key: 'remarkAddedBy', label: 'Remark Added By' },
        { key: 'remarkAddedOn', label: 'Remark Added On' },
        { key: 'remarkType', label: 'Remark Type' },
        { key: 'remarkNote', label: 'Remark Note' },
      ],
    },
    {
      title: 'SR',
      fields: [
        { key: 'customerName', label: 'Customer Name' },
        { key: 'customerNumber', label: 'Customer No.' },
        { key: 'srNumber', label: 'SR Number' },
        { key: 'requestDate', label: 'Request Date' },
        { key: 'requestType', label: 'Request Type' },
        { key: 'owner', label: 'Owner' },
        { key: 'status', label: 'Status' },
        { key: 'endDate', label: 'End Date' },
        { key: 'description', label: 'Description' },
        { key: 'materialList', label: 'Material List' },
        { key: 'totalVisitGiven', label: 'Total Visit Given' },
        { key: 'underWarranty', label: 'Under Warranty' },
        { key: 'contactEmail', label: 'Contact Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'sitePerson', label: 'Site Person' },
        { key: 'address', label: 'Address' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'countryCode', label: 'Country Code' },
        { key: 'email', label: 'Email' },
        { key: 'attendingRequirements', label: 'Attending Requirements' },
        { key: 'onSiteRequirements', label: 'OnSite Requirements' },
        { key: 'onHoldReason', label: 'On Hold Reason' },
        { key: 'postponedReason', label: 'Postponed Reason' },
        { key: 'lastUpdated', label: 'Last Updated' },
        { key: 'reOpenedOn', label: 'Re-Opened On' },
        { key: 'closedOn', label: 'Closed On' },
        { key: 'addedBy', label: 'Added By' },
        { key: 'addedOn', label: 'Added On' },
        { key: 'userType', label: 'User Type' },
        { key: 'userGroup', label: 'User Group' },
      ],
    },
  ],
  closed_sr: [],
}

FIELD_GROUPS_BY_CONTEXT.closed_sr = FIELD_GROUPS_BY_CONTEXT.sr

const createFilter = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  connector: 'AND',
  field: '',
  operator: 'equals',
  value: '',
})

const flattenFields = (groups) => groups.flatMap((group) => group.fields)

const renderGroupedFieldOptions = (groups) => groups.map((group) => (
  <optgroup key={group.title} label={group.subTitle || group.title}>
    {group.fields.map((field) => (
      <option key={field.key} value={field.key}>{field.label}</option>
    ))}
  </optgroup>
))

const ToggleNoYes = ({ checked, onChange, label }) => (
  <label className="remark-report-toggle-line">
    <button type="button" className={`remark-report-toggle ${checked ? 'remark-report-toggle-yes' : ''}`} onClick={() => onChange(!checked)}>
      <span className="remark-report-toggle-knob" aria-hidden="true" />
      <span className="remark-report-toggle-text">{checked ? 'YES' : 'NO'}</span>
    </button>
    <strong>{label}</strong>
  </label>
)

const AddRemarkReportPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const reportListPath = location.pathname.startsWith('/admin') ? '/admin/reports/custom' : '/reports/custom'
  const [reportContext, setReportContext] = useState('')
  const [timePeriodEnabled, setTimePeriodEnabled] = useState(false)
  const [includeSystemRemarks, setIncludeSystemRemarks] = useState(false)
  const [reportName, setReportName] = useState('')
  const [visibility, setVisibility] = useState('Visible to Me Only')
  const [description, setDescription] = useState('Remark Report Template')
  const [groupBy, setGroupBy] = useState('')
  const [orderBy, setOrderBy] = useState('')
  const [filters, setFilters] = useState([createFilter()])
  const [selectedFields, setSelectedFields] = useState([])
  const [activeAvailableField, setActiveAvailableField] = useState('')
  const [pageError, setPageError] = useState('')

  const selectedContext = useMemo(() => (
    REMARK_REPORT_CONTEXT_OPTIONS.find((option) => option.value === reportContext)
  ), [reportContext])

  const fieldGroups = useMemo(() => FIELD_GROUPS_BY_CONTEXT[reportContext] || [], [reportContext])
  const flatFields = useMemo(() => flattenFields(fieldGroups), [fieldGroups])
  const availableFieldGroups = useMemo(() => fieldGroups.map((group) => ({
    ...group,
    fields: group.fields.filter((field) => !selectedFields.includes(field.key)),
  })).filter((group) => group.fields.length > 0), [fieldGroups, selectedFields])

  const fieldLabelByKey = useMemo(() => flatFields.reduce((lookup, field) => {
    lookup[field.key] = field.label
    return lookup
  }, {}), [flatFields])
  const selectedFieldLabels = useMemo(() => (
    selectedFields.map((fieldKey) => fieldLabelByKey[fieldKey] || fieldKey)
  ), [fieldLabelByKey, selectedFields])

  const handleContextChange = (nextContext) => {
    const contextConfig = REMARK_REPORT_CONTEXT_OPTIONS.find((option) => option.value === nextContext)
    setReportContext(nextContext)
    setReportName('')
    setDescription(contextConfig?.description || 'Remark Report Template')
    setGroupBy('')
    setOrderBy('')
    setFilters([createFilter()])
    setSelectedFields([])
    setActiveAvailableField('')
  }

  const addSelectedField = (fieldKey = activeAvailableField) => {
    if (!fieldKey || selectedFields.includes(fieldKey)) return
    setSelectedFields((current) => [...current, fieldKey])
    setActiveAvailableField('')
  }

  const removeSelectedField = (fieldKey) => {
    setSelectedFields((current) => current.filter((entry) => entry !== fieldKey))
  }

  const moveSelectedField = (fieldKey, direction) => {
    setSelectedFields((current) => {
      const index = current.indexOf(fieldKey)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  const updateFilter = (filterId, updates) => {
    setFilters((current) => current.map((filter) => (filter.id === filterId ? { ...filter, ...updates } : filter)))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setPageError('')

    if (!selectedContext) {
      setPageError('Select the report context.')
      return
    }

    if (!reportName.trim()) {
      setPageError('Enter report name.')
      return
    }

    saveAdminReportTemplate({
      entityType: 'Remark',
      typeLabel: selectedContext.label,
      categoryKey: 'remark',
      reportContext,
      reportName: reportName.trim(),
      description: description.trim() || selectedContext.description,
      visibility,
      runtimePeriodEnabled: timePeriodEnabled,
      timePeriodEnabled,
      includeSystemRemarks,
      groupBy,
      orderBy,
      sortDirection: 'asc',
      aggregate: '',
      filters: filters.filter((filter) => filter.field),
      selectedFields,
      createdBy: user?.name || 'System Administrator',
      createdById: user?.id || user?.userId || '',
      createdByGroup: user?.userGroup || user?.group || user?.role || '',
      createdOn: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    navigate(reportListPath)
  }

  return (
    <div className="remark-report-builder-page">
      <div className="remark-report-builder-topbar">
        <h1>Add Remark Report</h1>
        <div className="remark-report-builder-topbar-actions">
          <button type="button" className="remark-report-builder-btn remark-report-builder-btn-cancel" onClick={() => navigate(reportListPath)}>
            Cancel
          </button>
          <button type="submit" form="remark-report-builder-form" className="remark-report-builder-btn remark-report-builder-btn-save">
            <FaSave /> Add
          </button>
        </div>
      </div>

      <form id="remark-report-builder-form" className="remark-report-builder-form" onSubmit={handleSubmit}>
        <section className="remark-report-builder-panel remark-report-builder-context-panel">
          <div className="remark-report-builder-row-inline">
            <label htmlFor="remark-report-context">Report Context <FaInfoCircle /></label>
            <select id="remark-report-context" value={reportContext} onChange={(event) => handleContextChange(event.target.value)}>
              <option value="">Select</option>
              {REMARK_REPORT_CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="remark-report-builder-panel remark-report-toggle-panel">
          <ToggleNoYes checked={timePeriodEnabled} onChange={setTimePeriodEnabled} label="For a time period ?" />
        </section>

        <section className="remark-report-builder-panel remark-report-toggle-panel">
          <ToggleNoYes checked={includeSystemRemarks} onChange={setIncludeSystemRemarks} label="Include System Remarks?" />
        </section>

        <section className="remark-report-builder-panel">
          <div className="remark-report-meta-form">
            <div className="remark-report-meta-row">
              <label>Report Name <FaInfoCircle /></label>
              <div className="remark-report-meta-controls remark-report-meta-controls-two">
                <input value={reportName} onChange={(event) => setReportName(event.target.value)} placeholder="Enter Report Name" />
                <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                  {VISIBILITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>

            <div className="remark-report-meta-row">
              <label>Report Description</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>

            <div className="remark-report-meta-row">
              <label>Group By <FaInfoCircle /></label>
              <div className="remark-report-inline-select">
                <button type="button" className="remark-report-plus-btn" onClick={() => setGroupBy(flatFields[0]?.key || '')}><FaPlus /></button>
                <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                  <option value="">Select</option>
                  {renderGroupedFieldOptions(fieldGroups)}
                </select>
              </div>
            </div>

            <div className="remark-report-meta-row">
              <label>Order By <FaInfoCircle /></label>
              <div className="remark-report-inline-select">
                <button type="button" className="remark-report-plus-btn" onClick={() => setOrderBy(flatFields[0]?.key || '')}><FaPlus /></button>
                <select value={orderBy} onChange={(event) => setOrderBy(event.target.value)}>
                  <option value="">Select</option>
                  {renderGroupedFieldOptions(fieldGroups)}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="remark-report-builder-panel remark-report-filter-panel">
          <div className="remark-report-section-label">Report Filters</div>
          <div className="remark-report-blue-box">
            <div className="remark-report-blue-heading"><FaTable /> Configure Filters</div>
            <div className="remark-report-filter-inner">
              <div className="remark-report-filter-title">Additional Filters</div>
              {filters.map((filter, index) => (
                <div className="remark-report-filter-row" key={filter.id}>
                  <span>{index === 0 ? 'If' : ''}</span>
                  <select value={filter.field} onChange={(event) => updateFilter(filter.id, { field: event.target.value })}>
                    <option value="">Select</option>
                    {renderGroupedFieldOptions(fieldGroups)}
                  </select>
                  <span>is</span>
                  <label className="remark-report-filter-not">
                    <input type="checkbox" checked={filter.operator === 'not_equals'} onChange={(event) => updateFilter(filter.id, { operator: event.target.checked ? 'not_equals' : 'equals' })} />
                    not
                  </label>
                  <select value={filter.operator} onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}>
                    {OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                  </select>
                  <input value={filter.value} onChange={(event) => updateFilter(filter.id, { value: event.target.value })} />
                  <button type="button" className="remark-report-plus-btn" onClick={() => setFilters((current) => [...current, createFilter()])}><FaPlus /></button>
                  {filters.length > 1 && (
                    <button type="button" className="remark-report-trash-btn" onClick={() => setFilters((current) => current.filter((entry) => entry.id !== filter.id))}><FaTrash /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="remark-report-builder-panel remark-report-fields-panel">
          <div className="remark-report-section-label">Report Fields</div>
          <div className="remark-report-blue-box">
            <div className="remark-report-blue-heading"><FaTable /> Select Fields</div>
            <div className="remark-report-fields-layout">
              <div className="remark-report-field-box">
                <div className="remark-report-field-box-heading"><FaTable /> Remark Attributes</div>
                <div className="remark-report-field-tree">
                  {availableFieldGroups.length === 0 ? (
                    <div className="remark-report-field-empty">Select report context to load fields.</div>
                  ) : availableFieldGroups.map((group) => (
                    <div key={group.title} className="remark-report-field-group">
                      {group.subTitle && <div className="remark-report-field-subtitle">{group.subTitle}</div>}
                      {!group.subTitle && <div className="remark-report-field-subtitle">{group.title}</div>}
                      {group.fields.map((field) => (
                        <button
                          type="button"
                          key={field.key}
                          className={`remark-report-field-row${activeAvailableField === field.key ? ' active' : ''}`}
                          onClick={() => setActiveAvailableField(field.key)}
                          onDoubleClick={() => addSelectedField(field.key)}
                        >
                          <FaRegListAlt /> <span>{field.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="remark-report-transfer">
                <button type="button" onClick={() => addSelectedField()}><FaArrowRight /></button>
              </div>

              <div className="remark-report-field-box">
                <div className="remark-report-field-box-heading"><FaTable /> Selected Fields</div>
                <div className="remark-report-selected-list">
                  {selectedFields.length === 0 ? (
                    <div className="remark-report-field-empty">No fields selected.</div>
                  ) : selectedFields.map((fieldKey) => (
                    <div key={fieldKey} className="remark-report-selected-item">
                      <span>{fieldLabelByKey[fieldKey] || fieldKey}</span>
                      <div>
                        <button type="button" onClick={() => moveSelectedField(fieldKey, -1)}>Up</button>
                        <button type="button" onClick={() => moveSelectedField(fieldKey, 1)}>Down</button>
                        <button type="button" onClick={() => removeSelectedField(fieldKey)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <ReportOutputPreview
          reportName={reportName || 'Remark Report'}
          selectedFields={selectedFieldLabels}
        />

        {pageError && <div className="remark-report-builder-error">{pageError}</div>}
      </form>
    </div>
  )
}

export default AddRemarkReportPage
