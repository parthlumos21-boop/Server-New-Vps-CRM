import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaChevronDown,
  FaChevronLeft,
  FaClipboardList,
  FaDownload,
  FaSort,
  FaFilePdf,
  FaEye,
  FaEnvelope,
  FaListUl,
  FaPrint,
  FaTimes,
  FaCheck,
  FaUsers,
} from 'react-icons/fa'
import { normalizeAccountRecord } from '../../../features/adminAccounts/adapters/normalizeAccountRecord'
import { ACCOUNT_OWNER_OPTIONS } from '../../../features/accounts/config/accountDropdownOptions'
import { isSameCrmOwner } from '../../../features/users/crmUserDirectory'
import { useData } from '../../../context/DataContext'
import { exportExcelWorkbook, exportCsvWorkbook } from '../../../utils/excelExport'
import {
  buildQuotationDocumentData,
  formatListDate,
  formatStatusLabel,
  QuotationDocument,
  QuotationPdfViewer,
  resolveLinkedAccount,
  safeLower,
  triggerBrowserPdfSave,
} from '../quotations/AdminQuotationsPage'
import { customViewApi } from '../../../services/customViewApi'
import { ExcelExportMenuButton } from '../../../components/common/ExcelExportButton'
import './QuotationSummaryReportPage.css'

/* â”€â”€ Static data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SEARCH_IN_OPTIONS = [
  { value: '',        label: 'Select' },
  { value: 'account', label: 'Account Quotation' },
  { value: 'deal',    label: 'Deal Quotation' },
]

const STATUSES = ['All Status', 'Open', 'Approved', 'Rejected', 'Cancelled']

const RESULT_COLUMNS = [
  { key: 'num',     label: 'Quotation No.' },
  { key: 'owner',   label: 'Quotation Owner'  },
  { key: 'date',    label: 'Quotation Date'   },
  { key: 'company', label: 'Company Name'     },
  { key: 'amount',  label: 'Amount'           },
  { key: 'status',  label: 'Status'           },
  { key: 'project', label: 'Project Name'     },
]

const ALL_FIELD_DEFINITIONS = [
  { key: 'num',                         label: 'Quotation No.' },
  { key: 'owner',                       label: 'Quotation Owner' },
  { key: 'date',                        label: 'Quotation Date' },
  { key: 'company',                     label: 'Company Name' },
  { key: 'amount',                      label: 'Amount' },
  { key: 'status',                      label: 'Status' },
  { key: 'project',                     label: 'Project Name' },
  { key: 'accountNumber',               label: 'Account No.' },
  { key: 'contextName',                 label: 'Context Name' },
  { key: 'contactPerson',               label: 'Contact Person' },
  { key: 'validUntil',                  label: 'Valid Until' },
  { key: 'productTotalBeforeDiscount',  label: 'Product Total Before Discount' },
  { key: 'serviceTotalBeforeDiscount',  label: 'Service Total Before Discount' },
  { key: 'productDiscountAmount',       label: 'Product Discount Amount' },
  { key: 'serviceDiscountAmount',       label: 'Service Discount Amount' },
  { key: 'productTax',                  label: 'Product Tax' },
  { key: 'serviceTax',                  label: 'Service Tax' },
  { key: 'productTotal',                label: 'Product Total' },
  { key: 'otherProductTotal',           label: 'Other Product Total' },
  { key: 'serviceTotal',                label: 'Service Total' },
  { key: 'otherServiceTotal',           label: 'Other Service Total' },
]

const QUOTATION_FIELDS_LEFT = [
  'accountNumber',
  'date',
  'contextName',
  'company',
  'contactPerson',
  'validUntil',
  'productTotalBeforeDiscount',
  'serviceTotalBeforeDiscount',
  'productDiscountAmount',
  'serviceDiscountAmount',
  'productTax',
  'serviceTax',
  'productTotal',
  'otherProductTotal',
  'serviceTotal',
  'otherServiceTotal',
  'amount',
]

const CURRENCY_FIELDS = [
  'amount',
  'productTotalBeforeDiscount',
  'serviceTotalBeforeDiscount',
  'productDiscountAmount',
  'serviceDiscountAmount',
  'productTax',
  'serviceTax',
  'productTotal',
  'otherProductTotal',
  'serviceTotal',
  'otherServiceTotal',
]

const SUMMARY_QUOTATION_LAYOUT_KEY = 'crm-summary-quotation-fields'
const SUMMARY_QUOTATION_LAYOUT_VIEW_ENTITY_TYPE = 'quotation_layout_preferences'
const SUMMARY_QUOTATION_LAYOUT_VIEW_NAME = 'Quotation Summary Report Layout'
const DEFAULT_SELECTED_FIELD_KEYS = RESULT_COLUMNS.map((column) => column.key)

const addDaysToDateString = (dateStr, days) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    const date = new Date(year, month, day)
    date.setDate(date.getDate() + days)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }
  return dateStr
}

const parseDateString = (dateStr) => {
  if (!dateStr) return 0
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime()
  }
  return new Date(dateStr).getTime()
}

const parseInputDateBoundary = (value, endOfDay = false) => {
  if (!value) return null
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

const normalizeRow = (row, index) => {
  const amount = row.amount || 0
  const productTotalBeforeDiscount = Math.round(amount * 0.85)
  const serviceTotalBeforeDiscount = Math.round(amount * 0.15)
  const productDiscountAmount = Math.round(productTotalBeforeDiscount * 0.05)
  const serviceDiscountAmount = Math.round(serviceTotalBeforeDiscount * 0.05)
  const productTax = Math.round((productTotalBeforeDiscount - productDiscountAmount) * 0.18)
  const serviceTax = Math.round((serviceTotalBeforeDiscount - serviceDiscountAmount) * 0.18)
  const productTotal = productTotalBeforeDiscount - productDiscountAmount + productTax
  const serviceTotal = serviceTotalBeforeDiscount - serviceDiscountAmount + serviceTax

  return {
    ...row,
    accountNumber: row.accountNumber || `ACC-${10000 + index}`,
    contextName: row.contextName || `${row.company || 'Client'} Context`,
    contactPerson: row.contactPerson || ['Rajesh Patel', 'Amit Shah', 'Sandip Mehta', 'Vijay Patel', 'Nilesh Shah'][index % 5],
    validUntil: row.validUntil || (row.date ? addDaysToDateString(row.date, 30) : '30-06-2026'),
    productTotalBeforeDiscount,
    serviceTotalBeforeDiscount,
    productDiscountAmount,
    serviceDiscountAmount,
    productTax,
    serviceTax,
    productTotal,
    otherProductTotal: 0.00,
    serviceTotal,
    otherServiceTotal: 0.00,
  }
}

const buildFallbackQuotationRecord = (row, index, quotationScope) => ({
  id: row.id || `summary-quotation-${index}`,
  quotationNumber: row.num,
  quotationDate: row.date,
  validUntil: row.validUntil || addDaysToDateString(row.date, 30),
  companyName: row.company,
  clientName: row.company,
  clientAccountNumber: row.accountNumber || '',
  projectName: row.project || '',
  quotationSubject: row.project || row.company || '',
  amount: row.amount || 0,
  currency: 'INR',
  status: safeLower(row.status) || 'open',
  selectedAccountOwner: row.owner || '',
  createdBy: row.owner || '',
  contactPerson: row.contactPerson || '',
  email: row.email || '',
  profileName: 'Swati Switchgears India Pvt Ltd',
  profileKey: 'swati',
  quotationScope,
})

const resolveLinkedDeal = (quotation, deals = []) => {
  if (!quotation || !Array.isArray(deals) || deals.length === 0) return null

  const dealId = String(quotation.dealId || quotation.relatedDealId || '').trim()
  if (dealId) {
    const byId = deals.find((deal) => String(deal.id) === dealId)
    if (byId) return byId
  }

  const projectName = safeLower(quotation.projectName || quotation.quotationSubject)
  const companyName = safeLower(quotation.companyName || quotation.clientName)
  const customerId = String(quotation.customerId || quotation.selectedAccountId || '').trim()

  return deals.find((deal) => {
    const matchesProject = projectName && (
      safeLower(deal.projectName) === projectName
      || safeLower(deal.name) === projectName
    )
    const matchesCompany = companyName && safeLower(deal.customerName) === companyName
    const matchesCustomer = customerId && String(deal.customerId || deal.accountId || '') === customerId
    return Boolean(matchesProject || matchesCompany || matchesCustomer)
  }) || null
}

const readSummaryQuotationLayout = () => {
  if (typeof window === 'undefined') {
    return {
      showLatestQuotations: 'YES',
      addOrderBy: 'YES',
      selectedFieldKeys: DEFAULT_SELECTED_FIELD_KEYS,
    }
  }

  try {
    const storedValue = window.localStorage.getItem(SUMMARY_QUOTATION_LAYOUT_KEY)
    if (!storedValue) {
      return {
        showLatestQuotations: 'YES',
        addOrderBy: 'YES',
        selectedFieldKeys: DEFAULT_SELECTED_FIELD_KEYS,
      }
    }

    const parsed = JSON.parse(storedValue)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const selectedFieldKeys = Array.isArray(parsed.selectedFieldKeys)
        ? parsed.selectedFieldKeys
        : DEFAULT_SELECTED_FIELD_KEYS
      
      const allowedKeys = new Set(ALL_FIELD_DEFINITIONS.map(f => f.key))
      const sanitizedKeys = selectedFieldKeys.filter(key => allowedKeys.has(key))
      
      return {
        showLatestQuotations: parsed.showLatestQuotations === 'NO' ? 'NO' : 'YES',
        addOrderBy: parsed.addOrderBy === 'NO' ? 'NO' : 'YES',
        selectedFieldKeys: sanitizedKeys.length > 0 ? sanitizedKeys : DEFAULT_SELECTED_FIELD_KEYS,
      }
    } else if (Array.isArray(parsed)) {
      const allowedKeys = new Set(ALL_FIELD_DEFINITIONS.map(f => f.key))
      const sanitizedKeys = parsed.filter(key => allowedKeys.has(key))
      return {
        showLatestQuotations: 'YES',
        addOrderBy: 'YES',
        selectedFieldKeys: sanitizedKeys.length > 0 ? sanitizedKeys : DEFAULT_SELECTED_FIELD_KEYS,
      }
    }
  } catch {
    // Fallback
  }

  return {
    showLatestQuotations: 'YES',
    addOrderBy: 'YES',
    selectedFieldKeys: DEFAULT_SELECTED_FIELD_KEYS,
  }
}

const sanitizeSummaryQuotationLayout = (layoutValue = {}) => {
  const allowedKeys = new Set(ALL_FIELD_DEFINITIONS.map((field) => field.key))
  const requestedKeys = Array.isArray(layoutValue?.selectedFieldKeys)
    ? layoutValue.selectedFieldKeys
    : Array.isArray(layoutValue?.columns)
      ? layoutValue.columns
      : DEFAULT_SELECTED_FIELD_KEYS
  const selectedFieldKeys = requestedKeys.filter((key) => allowedKeys.has(key))

  return {
    showLatestQuotations: layoutValue?.showLatestQuotations === 'NO' ? 'NO' : 'YES',
    addOrderBy: layoutValue?.addOrderBy === 'NO' ? 'NO' : 'YES',
    selectedFieldKeys: selectedFieldKeys.length > 0 ? selectedFieldKeys : DEFAULT_SELECTED_FIELD_KEYS,
  }
}

const ACCOUNT_ROWS = [
  { num: 'SSIPL/2026/00310', owner: 'Jigar Patel',  date: '16-05-2026', company: 'Ohm Encon Pvt. Ltd.',                   amount: 2448500.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00309', owner: 'Jigar Patel',  date: '15-05-2026', company: 'Shree Gurmukhdas Contractors Pvt. Ltd.',amount: 31613852.00, status: 'Open',     project: 'ISRO Project, Khambhaliya, Jamnagar' },
  { num: 'SSIPL/2026/00308', owner: 'Jigar Patel',  date: '13-05-2026', company: 'Pooja Construction',                    amount: 6772874.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00307', owner: 'Nita Bhavsar', date: '12-05-2026', company: 'Knight Frank (India) Pvt. Ltd.',        amount: 160000.00,   status: 'Open',     project: 'Combine Realty Pvt Ltd' },
  { num: 'SSIPL/2026/00306', owner: 'Jay Pandya',   date: '08-05-2026', company: 'CANPAC',                                amount: 3337040.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00305', owner: 'Krunal patel', date: '08-05-2026', company: 'Vishakha Group',                        amount: 338800.00,   status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00304', owner: 'Jigar Patel',  date: '08-05-2026', company: 'LCC Engineering Pvt. Ltd.',             amount: 26141200.00, status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00303', owner: 'Nita Bhavsar', date: '07-05-2026', company: 'SWISS PARENTERALS PVT LTD',             amount: 2422500.00,  status: 'Open',     project: 'Sanand' },
  { num: 'SSIPL/2026/00280', owner: 'Jigar Patel',  date: '04-05-2026', company: 'Gruham Consultant',                    amount: 3114492.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00270', owner: 'Krunal patel', date: '25-04-2026', company: 'Jsw Sambalpur Steel Ltd',              amount: 449900.00,   status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00268', owner: 'Jigar Patel',  date: '25-04-2026', company: 'LCC Engineering Pvt. Ltd.',             amount: 3057600.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00264', owner: 'Atish Shah',   date: '24-04-2026', company: 'ARW Infra Projects Pvt Ltd',           amount: 1816610.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00254', owner: 'Jigar Patel',  date: '20-04-2026', company: 'Utkarsh Patel',                        amount: 18620400.00, status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00240', owner: 'Atish Shah',   date: '13-04-2026', company: 'ARW-ANC-JK JV',                        amount: 35400.00,    status: 'Open',     project: 'Pre monsoon testing' },
  { num: 'SSIPL/2026/00231', owner: 'Nita Bhavsar', date: '08-04-2026', company: 'Karam Advance Tex Pvt Ltd',            amount: 940000.00,   status: 'Approved', project: '' },
  { num: 'SSIPL/2026/00220', owner: 'Atish Shah',   date: '01-04-2026', company: 'Shiv Construction',                   amount: 875000.00,   status: 'Approved', project: '' },
  { num: 'SSIPL/2026/00215', owner: 'Jay Pandya',   date: '30-03-2026', company: 'Reliance Industries',                 amount: 5400000.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00210', owner: 'Krunal patel', date: '28-03-2026', company: 'Torrent Power Ltd',                   amount: 2100000.00,  status: 'Rejected', project: '' },
  { num: 'SSIPL/2026/00205', owner: 'Jigar Patel',  date: '25-03-2026', company: 'Adani Ports SEZ Ltd',                 amount: 8500000.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00200', owner: 'Nita Bhavsar', date: '22-03-2026', company: 'Tata Steel',                          amount: 4200000.00,  status: 'Open',     project: 'Plant Expansion' },
]

const DEAL_ROWS = [
  { num: 'SSIPL/2026/00222', owner: 'Atish Shah',   date: '02-04-2026', company: 'JAY Chemical Industries Pvt Ltd',          amount: 228625.00,   status: 'Open',     project: 'MVR VFD' },
  { num: 'SSIPL/2026/00214', owner: 'Jigar Patel',  date: '31-03-2026', company: 'Vocation Projects India Pvt. Ltd.',        amount: 9772534.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00207', owner: 'Atish Shah',   date: '27-03-2026', company: 'Deep Industries Ltd.',                     amount: 1411870.00,  status: 'Open',     project: 'PLC PANEL FOR ONGC' },
  { num: 'SSIPL/2026/00204', owner: 'Nita Bhavsar', date: '27-03-2026', company: 'Plastene India Ltd',                       amount: 1741000.00,  status: 'Open',     project: 'Bhanu PV Solar Pvt. Ltd.' },
  { num: 'SSIPL/2026/00198', owner: 'Jigar Patel',  date: '24-03-2026', company: 'Supernova Gensets',                        amount: 9832350.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00196', owner: 'Krunal patel', date: '21-03-2026', company: 'Precision Asset Solutions Pvt Limited',    amount: 3665000.00,  status: 'Approved', project: '' },
  { num: 'SSIPL/2026/00183', owner: 'Atish Shah',   date: '13-03-2026', company: 'Rajkamal Builders Infrastructure Pvt Ltd', amount: 132160.00,   status: 'Open',     project: 'VFD' },
  { num: 'SSIPL/2026/00182', owner: 'Atish Shah',   date: '13-03-2026', company: 'Rajkamal Builders Infrastructure Pvt Ltd', amount: 363440.00,   status: 'Rejected', project: 'VFD' },
  { num: 'SSIPL/2026/00175', owner: 'Jay Pandya',   date: '10-03-2026', company: 'Adani Gas Ltd',                            amount: 4500000.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00168', owner: 'Krunal patel', date: '05-03-2026', company: 'ONGC Videsh Ltd',                          amount: 7800000.00,  status: 'Open',     project: 'Offshore Platform' },
  { num: 'SSIPL/2026/00162', owner: 'Jigar Patel',  date: '01-03-2026', company: 'Torrent Pharmaceuticals',                 amount: 2950000.00,  status: 'Approved', project: '' },
  { num: 'SSIPL/2026/00155', owner: 'Nita Bhavsar', date: '25-02-2026', company: 'Cadila Healthcare',                       amount: 1850000.00,  status: 'Open',     project: '' },
  { num: 'SSIPL/2026/00148', owner: 'Atish Shah',   date: '20-02-2026', company: 'Zydus Lifesciences',                      amount: 6200000.00,  status: 'Open',     project: 'New Plant' },
  { num: 'SSIPL/2026/00140', owner: 'Jay Pandya',   date: '15-02-2026', company: 'Sun Pharmaceutical',                      amount: 3400000.00,  status: 'Rejected', project: '' },
  { num: 'SSIPL/2026/00132', owner: 'Jigar Patel',  date: '10-02-2026', company: 'Alembic Pharmaceuticals',                 amount: 1920000.00,  status: 'Open',     project: '' },
]


function fmtAmt(v) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* â”€â”€ Custom dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const CustomSelect = ({ value, onChange, options, width }) => {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState({})
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef(null)
  const selected = options.find((o) => o.value === value) || options[0]

  const updatePanelPosition = () => {
    const trigger = ref.current?.querySelector('.qsr-select-btn')
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const estimatedHeight = Math.min(Math.max(options.length * 40, 120), 260)
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const spaceBelow = viewportHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12
    const shouldOpenUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
    const resolvedWidth = Math.max(rect.width, 220)
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, viewportWidth - resolvedWidth - 12)
    )

    setOpenUpward(shouldOpenUpward)
    setPanelStyle({
      position: 'fixed',
      top: shouldOpenUpward
        ? `${Math.max(12, rect.top - Math.min(estimatedHeight, spaceAbove))}px`
        : `${Math.min(viewportHeight - 12, rect.bottom + 4)}px`,
      left: `${left}px`,
      width: `${resolvedWidth}px`,
      maxHeight: `${Math.max(120, shouldOpenUpward ? spaceAbove : spaceBelow)}px`,
    })
  }

  const panelRef = useRef(null)

  useEffect(() => {
    // Close on outside mousedown â€” but treat clicks inside the portaled panel
    // as inside, since the panel lives outside ref.current in the DOM.
    const handler = (e) => {
      if (!open) return
      const insideTrigger = ref.current && ref.current.contains(e.target)
      const insidePanel = panelRef.current && panelRef.current.contains(e.target)
      if (!insideTrigger && !insidePanel) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    updatePanelPosition()

    const handleViewportChange = () => updatePanelPosition()
    window.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [open, options.length])

  return (
    <div className="qsr-custom-select" ref={ref} style={width ? { width } : undefined}>
      <button type="button" className="qsr-select-btn" onClick={() => setOpen((v) => !v)}>
        <span>{selected.label}</span>
        <FaChevronDown className={`qsr-select-caret${open ? ' qsr-select-caret--open' : ''}`} />
      </button>
      {open && createPortal(
        (
          <div
            ref={panelRef}
            className={`qsr-select-panel${openUpward ? ' qsr-select-panel--upward' : ''}`}
            style={panelStyle}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`qsr-select-option${value === opt.value ? ' qsr-select-option--active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
        document.body
      )}
    </div>
  )
}

/* â”€â”€ Toggle pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TogglePill = ({ on, onToggle, labelOn, labelOff }) => (
  <button
    type="button"
    className={`qsr-pill ${on ? 'qsr-pill--on' : 'qsr-pill--off'}`}
    onClick={onToggle}
  >
    <span className="qsr-pill-knob" />
    <span className="qsr-pill-text">{on ? (labelOn || 'ON') : (labelOff || 'OFF')}</span>
  </button>
)

/* â”€â”€ Square toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SquareToggle = ({ on, onToggle }) => (
  <button
    type="button"
    className={`qsr-sq-toggle ${on ? 'qsr-sq-toggle--on' : 'qsr-sq-toggle--off'}`}
    onClick={onToggle}
  >
    {on ? 'ON' : 'OFF'}
  </button>
)

/* â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const StatusBadge = ({ status }) => (
  <span className={`qsr-status qsr-status--${status.toLowerCase()}`}>{status}</span>
)

/* â”€â”€ Row action dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ROW_ACTIONS = [
  { key: 'pdf',      label: 'View As PDF',       icon: FaFilePdf  },
  { key: 'download', label: 'Download PDF',      icon: FaDownload },
  { key: 'preview',  label: 'Preview',           icon: FaEye      },
  { key: 'email',    label: 'Email Quote',       icon: FaEnvelope },
  { key: 'cancel',   label: 'Cancel Quote',      icon: FaTimes    },
  { key: 'approved', label: 'Customer Approved', icon: FaCheck    },
  { key: 'rejected', label: 'Customer Rejected', icon: FaTimes    },
  { key: 'deal',     label: 'View Deal',         icon: FaUsers    },
]

const RowActionMenu = ({ row, onAction, isOpen, onToggle }) => {
  const ref = useRef(null)
  const [menuStyle, setMenuStyle] = useState({})
  const [openUpward, setOpenUpward] = useState(false)

  const updateMenuPosition = () => {
    const trigger = ref.current?.querySelector('.qsr-row-badge')
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const estimatedHeight = Math.min(ROW_ACTIONS.length * 38 + 12, 320)
    const estimatedWidth = 220
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const spaceBelow = viewportHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12
    const shouldOpenUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, viewportWidth - estimatedWidth - 12)
    )

    setOpenUpward(shouldOpenUpward)
    setMenuStyle({
      position: 'fixed',
      top: shouldOpenUpward
        ? `${Math.max(12, rect.top - Math.min(estimatedHeight, spaceAbove))}px`
        : `${Math.min(viewportHeight - 12, rect.bottom + 4)}px`,
      left: `${left}px`,
      width: `${estimatedWidth}px`,
      maxHeight: `${Math.max(120, shouldOpenUpward ? spaceAbove : spaceBelow)}px`,
    })
  }

  const menuRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => {
      const insideTrigger = ref.current && ref.current.contains(e.target)
      const insideMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!insideTrigger && !insideMenu) onToggle(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [isOpen, onToggle])

  useEffect(() => {
    if (!isOpen) return undefined

    updateMenuPosition()

    const handleViewportChange = () => updateMenuPosition()
    window.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [isOpen])

  return (
    <div className="qsr-row-action" ref={ref}>
      <button type="button" className="qsr-row-badge" onClick={(e) => { e.stopPropagation(); onToggle(row.num) }}>
        {row.num.slice(-5)}
        <FaChevronDown className="qsr-row-badge-caret" />
      </button>
      {isOpen && createPortal(
        (
          <div
            ref={menuRef}
            className={`qsr-row-menu${openUpward ? ' qsr-row-menu--upward' : ''}`}
            style={menuStyle}
          >
            {ROW_ACTIONS.map((a) => {
              const IconComponent = a.icon
              return (
                <button
                  key={a.key}
                  type="button"
                  className="qsr-row-menu-item"
                  onClick={() => { onAction(a.key, row); onToggle(null) }}
                >
                  <IconComponent className="qsr-row-menu-icon" />
                  <span>{a.label}</span>
                </button>
              )
            })}
          </div>
        ),
        document.body
      )}
    </div>
  )
}

/* â”€â”€ Results table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ResultsTable = ({
  rows,
  perPage,
  onPerPageChange,
  searchText,
  onSearchChange,
  onRefine,
  openMenu,
  onMenuToggle,
  onAction,
  searchIn,
  selectedColumns,
  onOpenFieldPanel,
  onExportCsv,
  onExportExcel,
  addOrderBy,
  showLatestQuotations,
  sortConfig,
  onSortChange,
  ownerFilter,
  statusFilter,
  dateRangeLabel,
}) => {
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [rows])

  const filtered = useMemo(() => {
    if (!searchText.trim()) return rows
    const q = searchText.toLowerCase()
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    )
  }, [rows, searchText])

  const sorted = useMemo(() => {
    let list = [...filtered]
    if (addOrderBy === 'NO') {
      list.sort((a, b) => {
        const timeA = parseDateString(a.date)
        const timeB = parseDateString(b.date)
        if (showLatestQuotations === 'YES') {
          return timeB - timeA
        } else {
          return timeA - timeB
        }
      })
    } else {
      const { key, direction } = sortConfig
      list.sort((a, b) => {
        let valA = a[key]
        let valB = b[key]

        if (key === 'date') {
          valA = parseDateString(a.date)
          valB = parseDateString(b.date)
        } else if (key === 'validUntil') {
          valA = parseDateString(a.validUntil)
          valB = parseDateString(b.validUntil)
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA
        }

        const strA = String(valA || '').toLowerCase()
        const strB = String(valB || '').toLowerCase()
        return direction === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA)
      })
    }
    return list
  }, [filtered, addOrderBy, showLatestQuotations, sortConfig])

  const total   = sorted.length
  const pages   = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, pages)
  const slice   = sorted.slice((safePage - 1) * perPage, safePage * perPage)

  const totalAmt = rows.reduce((s, r) => s + r.amount, 0)

  const visiblePages = () => {
    const out = []
    const start = Math.max(1, safePage - 2)
    const end   = Math.min(pages, start + 4)
    for (let i = start; i <= end; i++) out.push(i)
    return out
  }

  const appliedType  = searchIn === 'account' ? 'All Accounts' : 'All Deals'
  const appliedOwner = ownerFilter && ownerFilter !== 'all' ? ownerFilter : 'All Owners'
  const appliedStatus = statusFilter || 'All Status'
  const appliedDate = dateRangeLabel ? `Quotes Generated Between: ${dateRangeLabel}` : 'All Dates'
  const filterLabel  = `${appliedType}, ${appliedOwner}, ${appliedStatus}, ${appliedDate}`

  return (
    <div className="qsr-results-phase">
      {/* Summary bar */}
      <div className="qsr-summary-bar">
        <div className="qsr-summary-amount">
          <span className="qsr-summary-amount-label">Total Amount:</span>
          <span className="qsr-summary-amount-value">{fmtAmt(totalAmt)}</span>
        </div>
        <div className="qsr-summary-filter-box">
          <span className="qsr-summary-filter-label">Applied Filter:</span>
          <span className="qsr-summary-filter-value">{filterLabel}</span>
        </div>
        <div className="qsr-summary-actions">
          <button type="button" className="qsr-icon-tool-btn qsr-icon-tool-btn--blue" title="Select Fields" onClick={onOpenFieldPanel}>
            <FaListUl />
          </button>
          <div className="qsr-export-wrap">
            <ExcelExportMenuButton
              label="Export"
              title="Export quotation summary"
              className="qsr-export-wrap"
              buttonClassName="qsr-icon-tool-btn qsr-icon-tool-btn--blue qsr-icon-tool-btn--export"
              menuClassName="qsr-export-menu"
              items={[
                {
                  key: 'quotation-summary-excel',
                  label: 'Export to Excel',
                  badge: 'XLSX',
                  onClick: () => onExportExcel(sorted, selectedColumns),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="qsr-table-controls">
        <div className="qsr-per-page-wrap">
          <select
            className="qsr-per-page-select"
            value={perPage}
            onChange={(e) => { onPerPageChange(Number(e.target.value)); setPage(1) }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="qsr-per-page-label">records per page</span>
        </div>
        <div className="qsr-search-wrap">
          <label className="qsr-search-label">Search:</label>
          <input
            type="text"
            className="qsr-search-input"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="qsr-table-scroll">
        <table className="qsr-table">
          <thead>
            <tr className="qsr-thead-row">
              {selectedColumns.map((col) => (
                <th
                  key={col.key}
                  className={`qsr-th ${addOrderBy === 'YES' ? 'qsr-th--sortable' : ''}`}
                  onClick={() => {
                    if (addOrderBy === 'YES') {
                      onSortChange(col.key)
                    }
                  }}
                  style={addOrderBy === 'YES' ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                >
                  {col.label}{' '}
                  {addOrderBy === 'YES' && (
                    <FaSort className={`qsr-sort-icon ${sortConfig.key === col.key ? 'qsr-sort-icon--active' : ''}`} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={selectedColumns.length} className="qsr-empty">No records found.</td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr key={row.num} className="qsr-row">
                  {selectedColumns.map((col) => {
                    if (col.key === 'num') {
                      return (
                        <td key={col.key} className="qsr-td">
                          <RowActionMenu
                            row={row}
                            isOpen={openMenu === row.num}
                            onToggle={onMenuToggle}
                            onAction={onAction}
                          />
                        </td>
                      )
                    }

                    if (CURRENCY_FIELDS.includes(col.key)) {
                      return (
                        <td key={col.key} className="qsr-td qsr-td--amount">
                          {fmtAmt(row[col.key] || 0)}
                        </td>
                      )
                    }

                    if (col.key === 'status') {
                      return <td key={col.key} className="qsr-td"><StatusBadge status={row.status} /></td>
                    }

                    const cellClassName = col.key === 'company' ? 'qsr-td qsr-td--link' : 'qsr-td'
                    return <td key={col.key} className={cellClassName}>{row[col.key] ?? 'â€”'}</td>
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="qsr-table-footer">
        <span className="qsr-showing">
          Showing {total === 0 ? 0 : (safePage - 1) * perPage + 1} to {Math.min(safePage * perPage, total)} of {total.toLocaleString()} entries
        </span>
        <div className="qsr-pagination">
          <button
            type="button"
            className={`qsr-page-btn qsr-page-prev${safePage === 1 ? ' qsr-page-btn--disabled' : ''}`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            â† Previous
          </button>
          {visiblePages().map((p) => (
            <button
              key={p}
              type="button"
              className={`qsr-page-btn${p === safePage ? ' qsr-page-btn--active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className={`qsr-page-btn qsr-page-next${safePage === pages ? ' qsr-page-btn--disabled' : ''}`}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={safePage === pages}
          >
            Next â†’
          </button>
        </div>
      </div>
    </div>
  )
}

const FieldSelectionModal = ({
  isOpen,
  draftSelection,
  onAddSelectedField,
  onRemoveSelectedField,
  onSelectedFieldDrop,
  setDraggedFieldKey,
  showLatestDraft,
  setShowLatestDraft,
  addOrderByDraft,
  setAddOrderByDraft,
  onApply,
  onSaveApply,
  onClose,
}) => {
  if (!isOpen) return null

  const leftFields = ALL_FIELD_DEFINITIONS.filter(
    (field) => QUOTATION_FIELDS_LEFT.includes(field.key) && !draftSelection.includes(field.key)
  )

  const rightFields = draftSelection
    .map((key) => ALL_FIELD_DEFINITIONS.find((f) => f.key === key))
    .filter(Boolean)

  return (
    <div className="qsr-field-panel-overlay" onClick={onClose}>
      <div className="qsr-field-panel" onClick={(e) => e.stopPropagation()}>
        <div className="qsr-field-panel-header">
          <h2 className="qsr-field-panel-title">Select Quotation Report Fields</h2>
          <div className="qsr-field-panel-actions">
            <button type="button" className="qsr-panel-btn qsr-panel-btn--close" onClick={onClose}>
              Close
            </button>
            <button type="button" className="qsr-panel-btn qsr-panel-btn--apply" onClick={onApply}>
              Apply
            </button>
            <button type="button" className="qsr-panel-btn qsr-panel-btn--save" onClick={onSaveApply}>
              Save &amp; Apply
            </button>
          </div>
        </div>

        {/* Toggles section */}
        <div className="qsr-field-panel-toggles">
          <div className="qsr-toggle-row-item">
            <span className="qsr-toggle-label-text">Show Latest Quotations</span>
            <div className="qsr-toggle-switch-group">
              <button
                type="button"
                className={`qsr-toggle-switch-btn ${showLatestDraft === 'YES' ? 'qsr-toggle-switch-btn--active' : ''}`}
                onClick={() => setShowLatestDraft('YES')}
              >
                YES
              </button>
              <button
                type="button"
                className={`qsr-toggle-switch-btn ${showLatestDraft === 'NO' ? 'qsr-toggle-switch-btn--active' : ''}`}
                onClick={() => setShowLatestDraft('NO')}
              >
                NO
              </button>
            </div>
          </div>

          <div className="qsr-toggle-row-item">
            <span className="qsr-toggle-label-text">Add Order By</span>
            <div className="qsr-toggle-switch-group">
              <button
                type="button"
                className={`qsr-toggle-switch-btn ${addOrderByDraft === 'YES' ? 'qsr-toggle-switch-btn--active' : ''}`}
                onClick={() => setAddOrderByDraft('YES')}
              >
                YES
              </button>
              <button
                type="button"
                className={`qsr-toggle-switch-btn ${addOrderByDraft === 'NO' ? 'qsr-toggle-switch-btn--active' : ''}`}
                onClick={() => setAddOrderByDraft('NO')}
              >
                NO
              </button>
            </div>
          </div>
        </div>

        {/* Two-panel Columns section */}
        <div className="qsr-field-panel-columns">
          {/* Left panel: Quotation Fields */}
          <div className="qsr-field-column">
            <div className="qsr-field-column-header">View Fields</div>
            <div className="qsr-field-column-subheader">Quotation Fields</div>
            <div className="qsr-field-column-list">
              {leftFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  className="qsr-field-option-button"
                  onClick={() => onAddSelectedField(field.key)}
                >
                  <span>{field.label}</span>
                  <span className="qsr-field-add-icon">+</span>
                </button>
              ))}
              {leftFields.length === 0 && (
                <div className="qsr-field-column-empty">All fields selected</div>
              )}
            </div>
          </div>

          {/* Right panel: Selected Fields */}
          <div className="qsr-field-column">
            <div className="qsr-field-column-header">&nbsp;</div>
            <div className="qsr-field-column-subheader">Selected Fields</div>
            <div className="qsr-field-column-list">
              {rightFields.map((field) => (
                <div
                  key={field.key}
                  className="qsr-field-selected-item"
                  draggable
                  onDragStart={() => setDraggedFieldKey(field.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onSelectedFieldDrop(field.key)}
                >
                  <span className="qsr-field-drag-label">{field.label}</span>
                  <button
                    type="button"
                    className="qsr-field-remove-btn"
                    onClick={() => onRemoveSelectedField(field.key)}
                    title="Remove field"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
              {rightFields.length === 0 && (
                <div className="qsr-field-column-empty">No fields selected</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* â”€â”€ Action modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ActionModal = ({ isOpen, title, children, onClose, sizeClass = '' }) => {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null
  return (
    <div className="qsr-modal-overlay" onClick={onClose}>
      <div className={`qsr-modal ${sizeClass}`.trim()} onClick={(e) => e.stopPropagation()}>
        <div className="qsr-modal-header">
          <h3 className="qsr-modal-title">{title}</h3>
          <button type="button" className="qsr-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="qsr-modal-body">{children}</div>
      </div>
    </div>
  )
}

/* â”€â”€ Toast notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Toast = ({ message, type, isVisible }) => {
  if (!isVisible) return null
  return (
    <div className={`qsr-toast qsr-toast--${type}`}>
      {type === 'success' && <FaCheck className="qsr-toast-icon" />}
      {type === 'error' && <FaTimes className="qsr-toast-icon" />}
      {type === 'info' && <FaEnvelope className="qsr-toast-icon" />}
      <span>{message}</span>
    </div>
  )
}

/* â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const QuotationSummaryReportPage = ({ basePath }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const resolvedReportBasePath = basePath || (location.pathname.startsWith('/admin') ? '/admin/reports' : '/reports')
  const dealViewPath = location.pathname.startsWith('/admin') ? '/admin/deals/view' : '/deals'
  const { quotations, accounts, deals, updateQuotation, addNotification } = useData()
  const toastTimer = useRef(null)

  /* Layout configuration state */
  const [layout, setLayout] = useState(readSummaryQuotationLayout)
  const [selectedFieldKeys, setSelectedFieldKeys] = useState(layout.selectedFieldKeys)
  const [showLatestQuotations, setShowLatestQuotations] = useState(layout.showLatestQuotations)
  const [addOrderBy, setAddOrderBy] = useState(layout.addOrderBy)

  /* Selection Drafts */
  const [fieldDraft, setFieldDraft] = useState(layout.selectedFieldKeys)
  const [showLatestDraft, setShowLatestDraft] = useState(layout.showLatestQuotations)
  const [addOrderByDraft, setAddOrderByDraft] = useState(layout.addOrderBy)
  const [savedLayoutViewId, setSavedLayoutViewId] = useState('')
  const [draggedFieldKey, setDraggedFieldKey] = useState('')

  /* Sorting state */
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  /* Filter state */
  const [searchIn,      setSearchIn]      = useState('')
  const [listByEntity,  setListByEntity]  = useState(true)   // List by Account / Deal toggle
  const [selectedOwner, setSelectedOwner] = useState('all')
  const [statusFilter,  setStatusFilter]  = useState('All Status')
  const [dateRangeOn,   setDateRangeOn]   = useState(false)  // Square toggle for date range
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  /* Results state */
  const [phase,         setPhase]         = useState('filter') // 'filter' | 'results'
  const [results,       setResults]       = useState([])
  const [perPage,       setPerPage]       = useState(10)
  const [searchText,    setSearchText]    = useState('')
  const [openMenu,      setOpenMenu]      = useState(null)
  const [isFieldPanelOpen, setIsFieldPanelOpen] = useState(false)
  /* Modal and toast state */
  const [modalOpen,     setModalOpen]     = useState(false)
  const [modalType,     setModalType]     = useState(null)  // 'pdf' | 'preview' | 'email'
  const [modalQuotation, setModalQuotation] = useState(null)
  const [pdfRow, setPdfRow] = useState(null)
  const [emailDraft, setEmailDraft] = useState({ to: '', subject: '', message: '' })
  const [toastMessage,  setToastMessage]  = useState('')
  const [toastType,     setToastType]     = useState('info')
  const [toastVisible,  setToastVisible]  = useState(false)

  useEffect(() => {
    let isActive = true

    const loadPersistedLayout = async () => {
      try {
        const views = await customViewApi.listCustomViews(SUMMARY_QUOTATION_LAYOUT_VIEW_ENTITY_TYPE)
        if (!isActive) return

        const savedView = views.find((view) => view.name === SUMMARY_QUOTATION_LAYOUT_VIEW_NAME) || null
        if (!savedView) return

        const nextLayout = sanitizeSummaryQuotationLayout({
          ...savedView.filters,
          columns: savedView.columns,
        })

        setSavedLayoutViewId(String(savedView.id || ''))
        setLayout(nextLayout)
        setSelectedFieldKeys(nextLayout.selectedFieldKeys)
        setShowLatestQuotations(nextLayout.showLatestQuotations)
        setAddOrderBy(nextLayout.addOrderBy)
        setFieldDraft(nextLayout.selectedFieldKeys)
        setShowLatestDraft(nextLayout.showLatestQuotations)
        setAddOrderByDraft(nextLayout.addOrderBy)
        window.localStorage.setItem(SUMMARY_QUOTATION_LAYOUT_KEY, JSON.stringify(nextLayout))
      } catch (_error) {
        // Keep local-storage fallback if custom-view loading is unavailable.
      }
    }

    loadPersistedLayout()
    return () => {
      isActive = false
    }
  }, [])

  const entityLabel = searchIn === 'deal' ? 'Deal' : 'Account'
  const selectedColumns = useMemo(
    () => selectedFieldKeys
      .map((key) => ALL_FIELD_DEFINITIONS.find((column) => column.key === key))
      .filter(Boolean),
    [selectedFieldKeys]
  )

  const normalizedAccounts = useMemo(
    () => accounts.map((account, index) => normalizeAccountRecord(account, index, { recordSource: 'quotation-summary-report' })),
    [accounts]
  )

  const liveRows = useMemo(() => (
    quotations.map((quotation, index) => {
      const linkedAccount = resolveLinkedAccount(quotation, normalizedAccounts)
      const linkedDeal = resolveLinkedDeal(quotation, deals)
      const quotationScope = quotation.selectedAccountId || quotation.clientAccountNumber ? 'account' : 'deal'
      const documentData = buildQuotationDocumentData(quotation, linkedAccount)

      return normalizeRow({
        id: quotation.id || `quotation-${index}`,
        num: quotation.quotationNumber || `Quotation ${index + 1}`,
        owner: quotation.selectedAccountOwner || linkedAccount?.accountOwner || quotation.createdBy || '-',
        date: formatListDate(quotation.quotationDate || quotation.createdAt),
        company: quotation.companyName || linkedAccount?.name || quotation.clientName || '-',
        amount: Number(documentData.total || quotation.amount || 0),
        status: formatStatusLabel(quotation.status || 'open'),
        project: quotation.projectName || quotation.product || quotation.otherProduct || quotation.otherService || '-',
        accountNumber: quotation.clientAccountNumber || linkedAccount?.accountNumber || '',
        contextName: linkedDeal?.name || linkedDeal?.dealNumber || `${quotation.companyName || linkedAccount?.name || 'Client'} Context`,
        contactPerson: quotation.contactPerson || linkedAccount?.contactPerson || '',
        validUntil: documentData.validUntil,
        email: quotation.email || linkedAccount?.email || linkedAccount?.contactEmail || '',
        linkedAccount,
        linkedDeal,
        raw: quotation,
        quotationScope,
      }, index)
    })
  ), [accounts, deals, normalizedAccounts, quotations])

  const fallbackRows = useMemo(() => ([
    ...ACCOUNT_ROWS.map((row, index) => normalizeRow({
      ...row,
      raw: buildFallbackQuotationRecord(row, index, 'account'),
      quotationScope: 'account',
      linkedAccount: null,
      linkedDeal: null,
      email: '',
    }, index)),
    ...DEAL_ROWS.map((row, index) => normalizeRow({
      ...row,
      raw: buildFallbackQuotationRecord(row, index, 'deal'),
      quotationScope: 'deal',
      linkedAccount: null,
      linkedDeal: null,
      email: '',
    }, ACCOUNT_ROWS.length + index)),
  ]), [])

  const sourceRows = liveRows.length > 0 ? liveRows : fallbackRows

  const ownerOptions = useMemo(() => {
    const uniqueOwners = new Map()
    ACCOUNT_OWNER_OPTIONS.forEach((ownerOption) => {
      const ownerName = String(ownerOption.label || ownerOption.value || '').trim()
      if (!ownerName || ownerName === '-') return
      const ownerKey = ownerName.toLowerCase().replace(/\s+/g, ' ')
      if (!uniqueOwners.has(ownerKey)) {
        uniqueOwners.set(ownerKey, ownerName)
      }
    })
    sourceRows.forEach((row) => {
      const ownerName = String(row.owner || '').trim()
      if (!ownerName || ownerName === '-') return
      const ownerKey = ownerName.toLowerCase().replace(/\s+/g, ' ')
      if (!uniqueOwners.has(ownerKey)) {
        uniqueOwners.set(ownerKey, ownerName)
      }
    })

    return [
      { value: 'all', label: 'All Owners' },
      ...Array.from(uniqueOwners.values())
        .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
        .map((ownerName) => ({ value: ownerName, label: ownerName })),
    ]
  }, [sourceRows])

  const showToast = (msg, type = 'info') => {
    setToastMessage(msg)
    setToastType(type)
    setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000)
  }

  const getFilteredSummaryRows = () => {
    if (!searchIn) return []

    let rows = sourceRows.filter((row) => row.quotationScope === searchIn)
    if (statusFilter && statusFilter !== 'All Status') {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (selectedOwner && selectedOwner !== 'all') {
      rows = rows.filter((r) => isSameCrmOwner(r.owner, selectedOwner))
    }
    if (dateRangeOn && (dateFrom || dateTo)) {
      const fromTime = parseInputDateBoundary(dateFrom)
      const toTime = parseInputDateBoundary(dateTo, true)
      rows = rows.filter((row) => {
        const rowTime = parseDateString(row.date)
        if (!rowTime || Number.isNaN(rowTime)) return false
        if (fromTime !== null && rowTime < fromTime) return false
        if (toTime !== null && rowTime > toTime) return false
        return true
      })
    }
    return rows
  }

  const handleSearchInChange = (val) => {
    setSearchIn(val)
    setPhase('filter')
    setResults([])
    setListByEntity(true)
    setSelectedOwner('all')
    setStatusFilter('All Status')
    setDateRangeOn(false)
    setDateFrom('')
    setDateTo('')
  }

  const handleView = () => {
    if (!searchIn) return
    setResults(getFilteredSummaryRows())
    setSearchText('')
    setPhase('results')
  }

  useEffect(() => {
    if (phase !== 'results' || !searchIn) return
    setResults(getFilteredSummaryRows())
  }, [dateFrom, dateRangeOn, dateTo, phase, searchIn, selectedOwner, sourceRows, statusFilter])

  const handleAddSelectedField = (fieldKey) => {
    setFieldDraft((currentValue) => {
      if (currentValue.includes(fieldKey)) return currentValue
      return [...currentValue, fieldKey]
    })
  }

  const handleRemoveSelectedField = (fieldKey) => {
    setFieldDraft((currentValue) => {
      if (currentValue.length <= 1) return currentValue
      return currentValue.filter((key) => key !== fieldKey)
    })
  }

  const handleSelectedFieldDrop = (targetFieldKey) => {
    if (!draggedFieldKey || draggedFieldKey === targetFieldKey) return

    setFieldDraft((currentValue) => {
      const currentIndex = currentValue.indexOf(draggedFieldKey)
      const targetIndex = currentValue.indexOf(targetFieldKey)
      if (currentIndex < 0 || targetIndex < 0) return currentValue

      const nextFields = [...currentValue]
      nextFields.splice(currentIndex, 1)
      nextFields.splice(targetIndex, 0, draggedFieldKey)

      return nextFields
    })
    setDraggedFieldKey('')
  }

  const handleApplyFieldSelection = () => {
    const nextLayout = sanitizeSummaryQuotationLayout({
      selectedFieldKeys: fieldDraft,
      showLatestQuotations: showLatestDraft,
      addOrderBy: addOrderByDraft,
    })
    setLayout(nextLayout)
    setSelectedFieldKeys(nextLayout.selectedFieldKeys)
    setShowLatestQuotations(nextLayout.showLatestQuotations)
    setAddOrderBy(nextLayout.addOrderBy)
    setIsFieldPanelOpen(false)
  }

  const persistSummaryQuotationLayout = async (layoutConfig) => {
    const sanitizedLayout = sanitizeSummaryQuotationLayout(layoutConfig)
    const payload = {
      entityType: SUMMARY_QUOTATION_LAYOUT_VIEW_ENTITY_TYPE,
      name: SUMMARY_QUOTATION_LAYOUT_VIEW_NAME,
      columns: sanitizedLayout.selectedFieldKeys,
      filters: {
        showLatestQuotations: sanitizedLayout.showLatestQuotations,
        addOrderBy: sanitizedLayout.addOrderBy,
      },
      sort: {},
      isDefault: false,
      isShared: false,
    }

    const persistedView = savedLayoutViewId
      ? await customViewApi.updateCustomView(savedLayoutViewId, payload)
      : await customViewApi.upsertCustomViewByName(payload)

    if (persistedView?.id) {
      setSavedLayoutViewId(String(persistedView.id))
    }

    return sanitizedLayout
  }

  const handleSaveFieldSelection = async () => {
    const layoutConfig = {
      showLatestQuotations: showLatestDraft,
      addOrderBy: addOrderByDraft,
      selectedFieldKeys: fieldDraft,
    }
    const sanitizedLayout = sanitizeSummaryQuotationLayout(layoutConfig)

    setSelectedFieldKeys(sanitizedLayout.selectedFieldKeys)
    setShowLatestQuotations(sanitizedLayout.showLatestQuotations)
    setAddOrderBy(sanitizedLayout.addOrderBy)
    setLayout(sanitizedLayout)
    window.localStorage.setItem(SUMMARY_QUOTATION_LAYOUT_KEY, JSON.stringify(sanitizedLayout))

    try {
      await persistSummaryQuotationLayout(sanitizedLayout)
    } catch (_error) {
      showToast('Quotation report fields saved locally. Database sync is unavailable right now.', 'info')
    }

    setIsFieldPanelOpen(false)
    showToast('Quotation report fields saved', 'success')
  }

  const handleSortChange = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const buildExportRows = (rowsToExport, columnsToExport) => rowsToExport.map((row) => {
    const exportRow = {}
    columnsToExport.forEach((column) => {
      if (CURRENCY_FIELDS.includes(column.key)) {
        exportRow[column.label] = fmtAmt(row[column.key] || 0)
        return
      }

      if (column.key === 'status') {
        exportRow[column.label] = row.status
        return
      }

      exportRow[column.label] = row[column.key] ?? ''
    })
    return exportRow
  })

  const buildSummaryExportOptions = (rowsToExport, columnsToExport) => {
    const exportRows = buildExportRows(rowsToExport, columnsToExport)
    return {
      title: 'Quotation Summary Report',
      subtitle: searchIn === 'deal' ? 'Deal Quotations' : 'Account Quotations',
      sheetName: 'Quotation Summary',
      metadata: [
        { label: 'Scope', value: searchIn === 'deal' ? 'Deal' : 'Account' },
        { label: 'Owner', value: selectedOwner && selectedOwner !== 'all' ? selectedOwner : 'All Owners' },
        { label: 'Status', value: statusFilter },
        ...(dateRangeOn ? [{
          label: 'Quotes Generated Between',
          value: `${dateFrom || 'Start'} to ${dateTo || 'Today'}`,
        }] : []),
        { label: 'Records', value: String(exportRows.length) },
        { label: 'Generated On', value: new Date().toLocaleString('en-IN') },
      ],
      columns: columnsToExport.map((column) => {
        const labelLower = String(column.label || '').toLowerCase()
        const isAmount = labelLower.includes('amount') || labelLower.includes('total') || labelLower.includes('tax') || labelLower.includes('discount')
        const isDate = labelLower.includes('date') || labelLower.includes('valid until')
        return {
          key: column.label,
          label: column.label,
          type: isAmount ? 'currency' : isDate ? 'date' : undefined,
          align: isAmount ? 'right' : isDate ? 'center' : undefined,
        }
      }),
      rows: exportRows,
    }
  }

  const handleExportCsv = (rowsToExport, columnsToExport) => {
    const dateStamp = new Date().toISOString().slice(0, 10)
    exportCsvWorkbook({
      ...buildSummaryExportOptions(rowsToExport, columnsToExport),
      filename: `Summary_Quotation_${dateStamp}.csv`,
    })
    showToast('Quotation summary exported to CSV', 'success')
  }

  const handleExportExcel = (rowsToExport, columnsToExport) => {
    const dateStamp = new Date().toISOString().slice(0, 10)
    exportExcelWorkbook({
      ...buildSummaryExportOptions(rowsToExport, columnsToExport),
      filename: `Summary_Quotation_${dateStamp}.xlsx`,
    })
    showToast('Quotation summary exported to Excel', 'success')
  }

  const buildDocumentForRow = (row) => {
    if (!row) return null
    return buildQuotationDocumentData(row.raw, row.linkedAccount)
  }

  const openEmailComposer = (row) => {
    const documentData = buildDocumentForRow(row)
    const nextSubject = `Quotation ${row.num}`
    const nextMessage = `Please find attached quotation ${row.num} for ${row.company}.`
    setEmailDraft({
      to: documentData?.email && documentData.email !== '-' ? documentData.email : '',
      subject: nextSubject,
      message: nextMessage,
    })
    setModalQuotation(row)
    setModalType('email')
    setModalOpen(true)
  }

  const handleSendEmail = () => {
    const recipient = emailDraft.to.trim()
    if (!recipient) {
      showToast('Enter a recipient email address first.', 'error')
      return
    }

    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(emailDraft.subject.trim())}&body=${encodeURIComponent(emailDraft.message.trim())}`
    window.location.href = mailtoUrl
    addNotification?.('success', 'Email composer opened', `Ready to send quotation ${modalQuotation?.num || ''}.`)
    showToast(`Email composer opened for ${modalQuotation?.num || 'quotation'}`, 'success')
    closeModal()
  }

  const navigateToDeal = (row) => {
    const dealLookup = {
      dealId: row?.linkedDeal?.id || '',
      dealNumber: row?.linkedDeal?.dealNumber || '',
      projectName: row?.project || row?.linkedDeal?.projectName || '',
      companyName: row?.company || row?.linkedDeal?.customerName || '',
    }

    navigate(dealViewPath, {
      state: { quotationDealLookup: dealLookup },
    })
  }

  const handleAction = async (key, row) => {
    setOpenMenu(null)
    
    switch (key) {
      case 'pdf':
        setPdfRow(row)
        showToast(`Opening PDF view for ${row.num}...`, 'info')
        break

      case 'download': {
        const documentData = buildDocumentForRow(row)
        if (!documentData) break
        triggerBrowserPdfSave(documentData)
        showToast(`PDF download started for ${row.num}`, 'success')
        break
      }
      
      case 'preview':
        setModalQuotation(row)
        setModalType('preview')
        setModalOpen(true)
        showToast(`Previewing ${row.num}`, 'info')
        break
      
      case 'email':
        openEmailComposer(row)
        showToast(`Email dialog ready for ${row.num}`, 'info')
        break
      
      case 'cancel':
        if (window.confirm(`Cancel quotation ${row.num}?`)) {
          if (row.raw?.id) {
            const result = await updateQuotation(row.raw.id, {
              status: 'cancelled',
            })
            if (!result?.success) {
              showToast(result?.message || `Unable to cancel quotation ${row.num}`, 'error')
              break
            }
          }
          setResults((prev) => prev.map((r) => (
            r.id === row.id
              ? {
                ...r,
                status: 'Cancelled',
                raw: {
                  ...r.raw,
                  status: 'cancelled',
                },
              }
              : r
          )))
          addNotification?.('success', 'Quotation cancelled', `${row.num} was marked as cancelled.`)
          showToast(`Quotation ${row.num} has been cancelled`, 'success')
        }
        break
      
      case 'approved':
        if (row.raw?.id) {
          const result = await updateQuotation(row.raw.id, {
            status: 'approved',
            rejectionReason: '',
            approvedAt: new Date().toISOString(),
          })
          if (!result?.success) {
            showToast(result?.message || `Unable to approve quotation ${row.num}`, 'error')
            break
          }
        }
        setResults((prev) => prev.map((r) => (
          r.id === row.id
            ? {
              ...r,
              status: 'Approved',
              raw: {
                ...r.raw,
                status: 'approved',
                rejectionReason: '',
              },
            }
            : r
        )))
        addNotification?.('success', 'Quotation approved', `${row.num} was marked as customer approved.`)
        showToast(`Quotation ${row.num} marked as Customer Approved`, 'success')
        break
      
      case 'rejected':
        if (window.confirm(`Mark quotation ${row.num} as rejected?`)) {
          const rejectionReason = window.prompt(`Enter rejection reason for ${row.num}`, row.raw?.rejectionReason || '') || ''
          if (row.raw?.id) {
            const result = await updateQuotation(row.raw.id, {
              status: 'rejected',
              rejectionReason,
              rejectedAt: new Date().toISOString(),
            })
            if (!result?.success) {
              showToast(result?.message || `Unable to reject quotation ${row.num}`, 'error')
              break
            }
          }
          setResults((prev) => prev.map((r) => (
            r.id === row.id
              ? {
                ...r,
                status: 'Rejected',
                raw: {
                  ...r.raw,
                  status: 'rejected',
                  rejectionReason,
                },
              }
              : r
          )))
          addNotification?.('success', 'Quotation rejected', `${row.num} was marked as customer rejected.`)
          showToast(`Quotation ${row.num} marked as Customer Rejected`, 'success')
        }
        break
      
      case 'deal':
        navigateToDeal(row)
        break
      
      default:
        break
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalType(null)
    setModalQuotation(null)
    setEmailDraft({ to: '', subject: '', message: '' })
  }

  const previewDocument = modalType === 'preview' ? buildDocumentForRow(modalQuotation) : null
  const pdfDocument = buildDocumentForRow(pdfRow)

  if (pdfDocument) {
    return (
      <QuotationPdfViewer
        documentData={pdfDocument}
        title={`QUOTATION - ${pdfDocument.quotationNumber}`}
        subtitle={pdfDocument.companyName}
        onBack={() => setPdfRow(null)}
        onPrint={() => triggerBrowserPdfSave(pdfDocument)}
        onDownload={() => triggerBrowserPdfSave(pdfDocument)}
      />
    )
  }

  return (
    <div className="qsr-page">

      {/* â”€â”€ Title bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="qsr-titlebar">
        <button type="button" className="qsr-back-btn" onClick={() => navigate(`${resolvedReportBasePath}/summary`)}>
          <FaChevronLeft />
        </button>
        <h2 className="qsr-title">Quotations - Summary Report</h2>
      </div>

      {/* â”€â”€ Search-In card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="qsr-search-in-card">
        <label className="qsr-label">Search In</label>
        <CustomSelect
          value={searchIn}
          onChange={handleSearchInChange}
          options={SEARCH_IN_OPTIONS}
          width="280px"
        />
      </div>

      {/* â”€â”€ Filter panel (phase: filter) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {searchIn && phase === 'filter' && (
        <div className="qsr-filter-card">
          {/* Top-right View button */}
          <div className="qsr-filter-card-topbar">
            <button type="button" className="qsr-view-btn" onClick={handleView}>
              <FaClipboardList className="qsr-view-btn-icon" />
              View
            </button>
          </div>

          <div className="qsr-filter-body">
            {/* LEFT â€“ Toggle pills */}
            <div className="qsr-filter-left">
              <div className="qsr-toggle-row">
                <TogglePill on={listByEntity} onToggle={() => setListByEntity((v) => !v)} />
                <span className="qsr-toggle-label">List by {entityLabel}:</span>
              </div>
              <label className="qsr-owner-filter">
                <span className="qsr-toggle-label">List by Owner:</span>
                <select
                  className="qsr-status-select qsr-owner-select"
                  value={selectedOwner}
                  onChange={(event) => setSelectedOwner(event.target.value)}
                >
                  {ownerOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Vertical divider */}
            <div className="qsr-filter-divider" />

            {/* RIGHT â€“ Status + Date range */}
            <div className="qsr-filter-right">
              <div className="qsr-status-row">
                <span className="qsr-filter-label-text">Quotation Status:</span>
                <select
                  className="qsr-status-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="qsr-date-row">
                <SquareToggle on={dateRangeOn} onToggle={() => setDateRangeOn((v) => !v)} />
                <span className="qsr-filter-label-text">Quotes Generated Between:</span>
              </div>

              {dateRangeOn && (
                <div className="qsr-date-inputs">
                  <input
                    type="date"
                    className="qsr-native-input"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <span className="qsr-date-sep">â€”</span>
                  <input
                    type="date"
                    className="qsr-native-input"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Results phase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {phase === 'results' && (
        <ResultsTable
          rows={results}
          perPage={perPage}
          onPerPageChange={setPerPage}
          searchText={searchText}
          onSearchChange={setSearchText}
          onRefine={() => setPhase('filter')}
          openMenu={openMenu}
          onMenuToggle={setOpenMenu}
          onAction={handleAction}
          searchIn={searchIn}
          selectedColumns={selectedColumns}
          onOpenFieldPanel={() => {
            setFieldDraft(selectedFieldKeys)
            setShowLatestDraft(showLatestQuotations)
            setAddOrderByDraft(addOrderBy)
            setIsFieldPanelOpen(true)
          }}
          onExportCsv={handleExportCsv}
          onExportExcel={handleExportExcel}
          addOrderBy={addOrderBy}
          showLatestQuotations={showLatestQuotations}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          ownerFilter={selectedOwner}
          statusFilter={statusFilter}
          dateRangeLabel={dateRangeOn ? `${dateFrom || 'Start'} to ${dateTo || 'Today'}` : ''}
        />
      )}

      <FieldSelectionModal
        isOpen={isFieldPanelOpen}
        draftSelection={fieldDraft}
        onAddSelectedField={handleAddSelectedField}
        onRemoveSelectedField={handleRemoveSelectedField}
        onSelectedFieldDrop={handleSelectedFieldDrop}
        setDraggedFieldKey={setDraggedFieldKey}
        showLatestDraft={showLatestDraft}
        setShowLatestDraft={setShowLatestDraft}
        addOrderByDraft={addOrderByDraft}
        setAddOrderByDraft={setAddOrderByDraft}
        onApply={handleApplyFieldSelection}
        onSaveApply={handleSaveFieldSelection}
        onClose={() => setIsFieldPanelOpen(false)}
      />

      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ActionModal isOpen={modalOpen && modalType === 'pdf'} title="View As PDF" onClose={closeModal}>
        {modalQuotation && (
          <div className="qsr-modal-content">
            <table className="qsr-modal-table">
              <tbody>
                <tr><td>Quotation No.:</td><td><strong>{modalQuotation.num}</strong></td></tr>
                <tr><td>Company:</td><td><strong>{modalQuotation.company}</strong></td></tr>
                <tr><td>Owner:</td><td><strong>{modalQuotation.owner}</strong></td></tr>
                <tr><td>Date:</td><td><strong>{modalQuotation.date}</strong></td></tr>
                <tr><td>Amount:</td><td><strong>{fmtAmt(modalQuotation.amount)}</strong></td></tr>
                <tr><td>Project:</td><td><strong>{modalQuotation.project || 'â€”'}</strong></td></tr>
              </tbody>
            </table>
            <div className="qsr-modal-footer">
              <button type="button" className="qsr-modal-btn qsr-modal-btn-primary" onClick={() => { showToast(`PDF for ${modalQuotation.num} downloaded`, 'success'); closeModal() }}>Download PDF</button>
              <button type="button" className="qsr-modal-btn qsr-modal-btn-secondary" onClick={closeModal}>Close</button>
            </div>
          </div>
        )}
      </ActionModal>

      <ActionModal isOpen={modalOpen && modalType === 'preview'} title="Preview" onClose={closeModal} sizeClass="qsr-modal--preview">
        {previewDocument && (
          <div className="qsr-modal-content">
            <QuotationDocument documentData={previewDocument} />
            <div className="qsr-modal-footer">
              <button
                type="button"
                className="qsr-modal-btn qsr-modal-btn-secondary"
                onClick={() => triggerBrowserPdfSave(previewDocument)}
              >
                <FaPrint />
                <span>Print</span>
              </button>
              <button
                type="button"
                className="qsr-modal-btn qsr-modal-btn-primary"
                onClick={() => {
                  const targetRow = modalQuotation
                  closeModal()
                  setPdfRow(targetRow)
                }}
              >
                <FaFilePdf />
                <span>View As PDF</span>
              </button>
              <button type="button" className="qsr-modal-btn qsr-modal-btn-secondary" onClick={closeModal}>Close Preview</button>
            </div>
          </div>
        )}
      </ActionModal>

      <ActionModal isOpen={modalOpen && modalType === 'email'} title="Email Quote" onClose={closeModal}>
        {modalQuotation && (
          <div className="qsr-modal-content">
            <div className="qsr-form-group">
              <label className="qsr-form-label">To:</label>
              <input
                type="email"
                className="qsr-form-input"
                placeholder="recipient@example.com"
                value={emailDraft.to}
                onChange={(event) => setEmailDraft((currentValue) => ({ ...currentValue, to: event.target.value }))}
              />
            </div>
            <div className="qsr-form-group">
              <label className="qsr-form-label">Subject:</label>
              <input
                type="text"
                className="qsr-form-input"
                value={emailDraft.subject}
                onChange={(event) => setEmailDraft((currentValue) => ({ ...currentValue, subject: event.target.value }))}
              />
            </div>
            <div className="qsr-form-group">
              <label className="qsr-form-label">Message:</label>
              <textarea
                className="qsr-form-textarea"
                rows="5"
                placeholder="Enter your message..."
                value={emailDraft.message}
                onChange={(event) => setEmailDraft((currentValue) => ({ ...currentValue, message: event.target.value }))}
              />
            </div>
            <div className="qsr-modal-footer">
              <button type="button" className="qsr-modal-btn qsr-modal-btn-primary" onClick={handleSendEmail}>Send Email</button>
              <button type="button" className="qsr-modal-btn qsr-modal-btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        )}
      </ActionModal>

      {/* â”€â”€ Toast notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â€“ */}
      <Toast message={toastMessage} type={toastType} isVisible={toastVisible} />

    </div>
  )
}

export default QuotationSummaryReportPage
