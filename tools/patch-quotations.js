import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const jsxFile = path.join(rootDir, 'src', 'pages', 'admin', 'quotations', 'AdminQuotationsPage.jsx')
const cssFile = path.join(rootDir, 'src', 'pages', 'admin', 'quotations', 'AdminQuotationsPage.css')
const quotationSummaryCssFile = path.join(rootDir, 'src', 'pages', 'admin', 'reports', 'QuotationSummaryReportPage.css')

// 1. Patch CSS File
if (fs.existsSync(cssFile)) {
  let cssContent = fs.readFileSync(cssFile, 'utf8')
  
  // Change th background to red in preview/view document
  const targetTh = ".aqp-doc__table th {\n  background: #1f6ea4;"
  const replacementTh = ".aqp-doc__table th {\n  background: #dc2626;"
  if (cssContent.includes(targetTh)) {
    cssContent = cssContent.replace(targetTh, replacementTh)
    console.log('Patched preview/view document th background in CSS.')
  }

  // Change eyebrow heading color to red in document (Customer Details, Sales Details, etc.)
  const targetEyebrow = ".aqp-doc__eyebrow {\n  margin-bottom: 0.55rem;\n  color: var(--text-primary);"
  const replacementEyebrow = ".aqp-doc__eyebrow {\n  margin-bottom: 0.55rem;\n  color: #dc2626 !important;"
  if (cssContent.includes(targetEyebrow)) {
    cssContent = cssContent.replace(targetEyebrow, replacementEyebrow)
    console.log('Patched document eyebrow heading color to red in CSS.')
  }

  // Append white header text enforcement, red modal header, and View Quote table width rules
  const cssOverrides = `\n/* Enforce white text for aqp-table header cells and icons in light theme */\nhtml:not([data-theme="dark"]) .aqp-table thead th,\nhtml:not([data-theme="dark"]) .aqp-table thead th *,\nhtml.is-user:not([data-theme="dark"]) .layout--user .aqp-table thead th,\nhtml.is-user:not([data-theme="dark"]) .layout--user .aqp-table thead th * {\n  color: #ffffff !important;\n  -webkit-text-fill-color: #ffffff !important;\n}\n\n/* Red theme for View/Preview quotation modal header in light theme */\nhtml:not([data-theme="dark"]) .aqp-modal--xl .aqp-modal-header {\n  background: #dc2626 !important;\n  color: #ffffff !important;\n  border-bottom: 1px solid #b91c1c !important;\n}\nhtml:not([data-theme="dark"]) .aqp-modal--xl .aqp-modal-header .aqp-modal-title,\nhtml:not([data-theme="dark"]) .aqp-modal--xl .aqp-modal-header .aqp-modal-close {\n  color: #ffffff !important;\n}\n\n/* Constrain items table width inside the View Quotation modal to prevent right-side bleed */\n.aqp-view-quotation-document .aqp-doc__table {\n  width: calc(100% - 1.5rem) !important;\n  max-width: calc(100% - 1.5rem) !important;\n  margin: 0 auto !important;\n  table-layout: fixed !important;\n}\n\n/* Optimize spacing and reduce padding inside View Quotation table cells */\n.aqp-view-quotation-document .aqp-doc__table th,\n.aqp-view-quotation-document .aqp-doc__table td {\n  padding: 0.38rem 0.5rem !important;\n}\n`
  if (!cssContent.includes('.aqp-table thead th *')) {
    cssContent += cssOverrides
    console.log('Appended custom CSS overrides to CSS.')
  }
  
  fs.writeFileSync(cssFile, cssContent, 'utf8')
} else {
  console.error(`Error: CSS file not found at ${cssFile}`)
}

// 1b. Patch Quotation Summary Report CSS File
if (fs.existsSync(quotationSummaryCssFile)) {
  let summaryCssContent = fs.readFileSync(quotationSummaryCssFile, 'utf8')
  const summaryTableOverrides = `

/* Red static theme for Quotation Summary result tables. */
.qsr-page .qsr-table-scroll {
  border: 1px solid #dc2626 !important;
  border-radius: 8px 8px 0 0 !important;
  box-shadow: none !important;
}

.qsr-page .qsr-table-scroll *,
.qsr-page .qsr-table-scroll *::before,
.qsr-page .qsr-table-scroll *::after {
  transition: none !important;
}

.qsr-page .qsr-table {
  background: #ffffff !important;
  border-color: #dc2626 !important;
}

.qsr-page .qsr-thead-row,
.qsr-page .qsr-th {
  background: #dc2626 !important;
  background-color: #dc2626 !important;
  border-color: #b91c1c !important;
  border-right: 1px solid #b91c1c !important;
  color: #ffffff !important;
  box-shadow: none !important;
  transform: none !important;
}

.qsr-page .qsr-table .qsr-th:hover,
.qsr-page .qsr-table .qsr-th--sortable:hover,
.qsr-page .qsr-table-scroll .qsr-thead-row:hover,
.qsr-page .qsr-table-scroll .qsr-th:hover,
.qsr-page .qsr-table-scroll .qsr-th--sortable:hover {
  background: #dc2626 !important;
  background-color: #dc2626 !important;
  color: #ffffff !important;
  border-color: #b91c1c !important;
  border-right-color: #b91c1c !important;
  transform: none !important;
  box-shadow: none !important;
  transition: none !important;
}

.qsr-page .qsr-row,
.qsr-page .qsr-row .qsr-td {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border-color: var(--border-subtle) !important;
  color: var(--text-primary) !important;
  box-shadow: none !important;
  transform: none !important;
}

.qsr-page .qsr-row:nth-child(even),
.qsr-page .qsr-row:nth-child(even) .qsr-td {
  background: #f8fafc !important;
  background-color: #f8fafc !important;
}

.qsr-page .qsr-table .qsr-row:hover,
.qsr-page .qsr-table .qsr-row:hover .qsr-td,
.qsr-page .qsr-table-scroll .qsr-row:hover,
.qsr-page .qsr-table-scroll .qsr-row:hover .qsr-td,
.qsr-page .qsr-table-scroll .qsr-row:hover .qsr-status {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border-color: var(--border-subtle) !important;
  box-shadow: none !important;
  transform: none !important;
  color: var(--text-primary) !important;
  transition: none !important;
}

.qsr-page .qsr-table .qsr-row:nth-child(even):hover,
.qsr-page .qsr-table .qsr-row:nth-child(even):hover .qsr-td,
.qsr-page .qsr-table-scroll .qsr-row:nth-child(even):hover,
.qsr-page .qsr-table-scroll .qsr-row:nth-child(even):hover .qsr-td,
.qsr-page .qsr-table-scroll .qsr-row:nth-child(even):hover .qsr-status {
  background: #f8fafc !important;
  background-color: #f8fafc !important;
  border-color: var(--border-subtle) !important;
  transition: none !important;
}

.qsr-page .qsr-table-scroll .qsr-row-badge,
.qsr-page .qsr-table-scroll .qsr-row-badge:hover {
  background: #ef4444 !important;
  background-color: #ef4444 !important;
  border-color: #ef4444 !important;
  box-shadow: none !important;
  color: #ffffff !important;
  transform: none !important;
}
`
  if (!summaryCssContent.includes('Red static theme for Quotation Summary result tables')) {
    summaryCssContent += summaryTableOverrides
    fs.writeFileSync(quotationSummaryCssFile, summaryCssContent, 'utf8')
    console.log('Appended quotation summary red no-hover table overrides to CSS.')
  }
} else {
  console.error(`Error: Quotation summary CSS file not found at ${quotationSummaryCssFile}`)
}

// 2. Patch JSX File
if (fs.existsSync(jsxFile)) {
  let jsxContent = fs.readFileSync(jsxFile, 'utf8')

  // Change th background in print view
  const targetPrintTh = ".items-table th {\n          background: #1f6ea4;"
  const replacementPrintTh = ".items-table th {\n          background: #dc2626;"
  if (jsxContent.includes(targetPrintTh)) {
    jsxContent = jsxContent.replace(targetPrintTh, replacementPrintTh)
    console.log('Patched print document th background in JSX.')
  }

  // Change print iframe dimensions to A4 aspect ratio
  const targetIframe = "printFrame.style.width = '1024px'\n  printFrame.style.height = '768px'"
  const replacementIframe = "printFrame.style.width = '800px'\n  printFrame.style.height = '1130px'"
  if (jsxContent.includes(targetIframe)) {
    jsxContent = jsxContent.replace(targetIframe, replacementIframe)
    console.log('Patched print iframe width/height in JSX.')
  }

  // Change print media max-width
  const targetPrintMedia = ".quotation-print { max-width: none; border: none; }"
  const replacementPrintMedia = ".quotation-print { max-width: 100% !important; border: none; width: 100% !important; }"
  if (jsxContent.includes(targetPrintMedia)) {
    jsxContent = jsxContent.replace(targetPrintMedia, replacementPrintMedia)
    console.log('Patched printed table width constraint in JSX.')
  }

  // Wrap document table in a scrollable div wrapper to prevent overflow
  const targetDocTableOpen = "        <table className=\"aqp-doc__table\">"
  const replacementDocTableOpen = "        <div style={{ overflowX: 'auto', width: '100%' }}>\n          <table className=\"aqp-doc__table\">"
  if (jsxContent.includes(targetDocTableOpen)) {
    jsxContent = jsxContent.replace(targetDocTableOpen, replacementDocTableOpen)
    console.log('Wrapped document table in a scrollable container in JSX.')
  }

  const targetDocTableClose = "        </table>\n\n        <div className=\"aqp-doc__summary\">"
  const replacementDocTableClose = "        </table>\n        </div>\n\n        <div className=\"aqp-doc__summary\">"
  if (jsxContent.includes(targetDocTableClose)) {
    jsxContent = jsxContent.replace(targetDocTableClose, replacementDocTableClose)
    console.log('Closed scrollable container in JSX.')
  }

  // Reduce widths of table columns inside the View Quotation modal
  const targetColWidths = `              <th style={{ width: '56px' }}>Sr.</th>\n              <th>Description</th>\n              <th style={{ width: '80px' }}>Qty</th>\n              <th style={{ width: '88px' }}>Unit</th>\n              <th style={{ width: '120px' }}>Rate</th>\n              <th style={{ width: '140px' }}>Amount</th>`
  const replacementColWidths = `              <th style={{ width: '38px' }}>Sr.</th>\n              <th>Description</th>\n              <th style={{ width: '52px' }}>Qty</th>\n              <th style={{ width: '58px' }}>Unit</th>\n              <th style={{ width: '84px' }}>Rate</th>\n              <th style={{ width: '96px' }}>Amount</th>`
  if (jsxContent.includes(targetColWidths)) {
    jsxContent = jsxContent.replace(targetColWidths, replacementColWidths)
    console.log('Patched line item column width styles in JSX.')
  }

  // Remove Phone line from Customer Details section
  const targetPhoneRow = `            <div className="aqp-doc__field-row"><strong>Phone</strong>{editValue('telephone', documentData.telephone)}</div>`
  if (jsxContent.includes(targetPhoneRow)) {
    jsxContent = jsxContent.replace(targetPhoneRow, '')
    console.log('Removed Phone row from Customer Details in JSX.')
  }

  // Change Close button to Cancel inside View Quote popup top right bar
  const targetCloseBtn = `              <button type="button" className="aqp-btn aqp-btn--gray" onClick={closeQuotationView}>\n                Close\n              </button>`
  const replacementCancelBtn = `              <button type="button" className="aqp-btn aqp-btn--gray" onClick={closeQuotationView}>\n                Cancel\n              </button>`
  if (jsxContent.includes(targetCloseBtn)) {
    jsxContent = jsxContent.replace(targetCloseBtn, replacementCancelBtn)
    console.log('Changed Close button to Cancel inside View Quote top bar in JSX.')
  }

  // Remove 'pdf' from ACTIONS array
  const targetActions = "export const ACTIONS = [\n  { key: 'pdf', label: 'View As PDF', icon: FaFilePdf, iconClass: 'aqp-action-icon--pdf' },\n  { key: 'preview', label: 'Preview', icon: FaEye },"
  const replacementActions = "export const ACTIONS = [\n  { key: 'preview', label: 'Preview', icon: FaEye },"
  if (jsxContent.includes(targetActions)) {
    jsxContent = jsxContent.replace(targetActions, replacementActions)
    console.log('Removed PDF action from ACTIONS in JSX.')
  }

  // Remove 'pdf' from visible keys
  const targetKeysViewer = "if (role === 'viewer' || (!isOwner && !canApprove)) {\n    return ['pdf', 'preview', 'view']\n  }"
  const replacementKeysViewer = "if (role === 'viewer' || (!isOwner && !canApprove)) {\n    return ['preview', 'view']\n  }"
  if (jsxContent.includes(targetKeysViewer)) {
    jsxContent = jsxContent.replace(targetKeysViewer, replacementKeysViewer)
    console.log("Removed 'pdf' from viewer action keys in JSX.")
  }

  const targetKeysAll = "const actionKeys = ['pdf', 'preview', 'view', 'clone']"
  const replacementKeysAll = "const actionKeys = ['preview', 'view', 'clone']"
  if (jsxContent.includes(targetKeysAll)) {
    jsxContent = jsxContent.replace(targetKeysAll, replacementKeysAll)
    console.log("Removed 'pdf' from default action keys in JSX.")
  }

  fs.writeFileSync(jsxFile, jsxContent, 'utf8')
} else {
  console.error(`Error: JSX file not found at ${jsxFile}`)
}

console.log('Patch process complete!')
