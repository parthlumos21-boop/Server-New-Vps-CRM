import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FiCheck,
  FiChevronDown,
  FiEdit3,
  FiFilter,
  FiGrid,
  FiLayers,
  FiList,
  FiRefreshCw,
  FiSettings,
  FiUpload,
  FiUserCheck,
} from 'react-icons/fi'
import * as XLSX from 'xlsx'
import { useClickOutside } from '../../../hooks'
import { useAuth } from '../../../context/AuthContext'
import { getCrmOwnerCode } from '../../../features/users/crmUserDirectory'
import { leadApi } from '../../../services/leadApi'
import { dealApi } from '../../../services/dealApi'
import './AccountBoardHeaderActions.css'

const SHOW_BULK_ACTIONS = false

const AccountBoardHeaderActions = ({
  view,
  currentStageRows,
  allRows,
  activeStageLabel,
  visibleColumns,
  allColumns,
  onApplyVisibleColumns,
  showFilters,
  onToggleFilters,
  onRefresh,
  filterButtonTitle,
  refreshButtonTitle = 'Refresh',
  sourceStageOptions = [],
  visibleSourceStageKeys = [],
  onApplyVisibleSourceStages,
  selectedRows = [],
  onBulkAddRemark,
  onBulkReAssign,
  onBulkValidationError,
}) => {
  const { user } = useAuth()
  const actions = view.titlebarActions || {}
  const [openMenu, setOpenMenu] = useState(null)
  const [pendingColumnKeys, setPendingColumnKeys] = useState(() => visibleColumns.map((column) => column.key))
  const [pendingSourceKeys, setPendingSourceKeys] = useState(() => visibleSourceStageKeys)
  const [bulkMenuPosition, setBulkMenuPosition] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)
  const bulkTriggerRef = useRef(null)
  const closeMenu = useCallback(() => {
    setOpenMenu(null)
    setBulkMenuPosition(null)
  }, [])
  const menuRef = useClickOutside(closeMenu)

  useEffect(() => {
    setPendingColumnKeys(visibleColumns.map((column) => column.key))
  }, [visibleColumns])

  useEffect(() => {
    setPendingSourceKeys(visibleSourceStageKeys)
  }, [visibleSourceStageKeys])

  const selectedCount = selectedRows.length
  const activeMenuRef = openMenu ? menuRef : null
  const moreMenuOptions = useMemo(() => ([
    {
      key: 'toggle-filters',
      label: showFilters ? 'Hide Filters' : 'Show Filters',
      onClick: () => {
        onToggleFilters()
        closeMenu()
      },
    },
    {
      key: 'show-all-columns',
      label: 'Show All Columns',
      onClick: () => {
        onApplyVisibleColumns(allColumns.map((column) => column.key))
        closeMenu()
      },
    },
  ]), [allColumns, closeMenu, onApplyVisibleColumns, onToggleFilters, showFilters])

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleImportFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const raw2DRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
      let headerRowIndex = -1
      for (let i = 0; i < Math.min(raw2DRows.length, 15); i++) {
        const rowStr = (raw2DRows[i] || []).join(' ').toLowerCase()
        if (
          rowStr.includes('account name') ||
          rowStr.includes('project name') ||
          rowStr.includes('account date') ||
          rowStr.includes('account category') ||
          rowStr.includes('contact person')
        ) {
          headerRowIndex = i
          break
        }
      }

      let validRows = []
      if (headerRowIndex !== -1) {
        const headers = (raw2DRows[headerRowIndex] || []).map((h) => String(h || '').trim())
        for (let i = headerRowIndex + 1; i < raw2DRows.length; i++) {
          const rowArr = raw2DRows[i]
          if (!rowArr || rowArr.length === 0) continue
          const rowObj = {}
          headers.forEach((h, colIdx) => {
            if (h) rowObj[h] = rowArr[colIdx]
          })
          const rowText = Object.values(rowObj).join(' ')
          if (/Generated on:/i.test(rowText) || /Report Filter/i.test(rowText) || /Page \d+/i.test(rowText)) continue
          if (Object.values(rowObj).some((val) => String(val || '').trim() !== '')) {
            validRows.push(rowObj)
          }
        }
      } else {
        const rawObjects = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        validRows = rawObjects.filter((row) => {
          if (!row || typeof row !== 'object') return false
          const rowText = Object.values(row).join(' ')
          if (/Generated on:/i.test(rowText) || /Report Filter/i.test(rowText)) return false
          return Object.values(row).some((val) => String(val || '').trim() !== '')
        })
      }

      if (validRows.length === 0) {
        alert('No valid rows found in the selected file.')
        setIsImporting(false)
        return
      }

      const normKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '')

      // Dynamic logged-in user and ownerCode resolution
      const loggedInUserName = user?.name || user?.username || 'Jay Pandya'
      const loggedInOwnerCode = String(user?.ownerCode || getCrmOwnerCode(loggedInUserName) || '1004').trim()
      const loggedInUserId = user?.id || null

      let existingLeads = []
      try {
        existingLeads = await leadApi.getLeads()
      } catch (fetchErr) {
        console.warn('Could not fetch existing leads prior to import cleanup:', fetchErr)
      }

      const payloadsToImport = []
      for (const row of validRows) {
        const getVal = (...keys) => {
          const rowKeys = Object.keys(row || {})
          for (const k of keys) {
            const kNorm = normKey(k)
            const matchKey = rowKeys.find((rk) => normKey(rk) === kNorm)
            if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
              const val = String(row[matchKey]).trim()
              if (val !== '' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') return val
            }
          }
          return ''
        }

        const sanitizeEmail = (val) => {
          if (!val) return undefined
          const cleaned = String(val).trim()
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : undefined
        }

        const isCodePatternStr = (str) => typeof str === 'string' && /^[A-Z]{2,4}\d{4,8}$/i.test(str.trim())

        const parseExcelDateValue = (rawDate) => {
          if (!rawDate) return undefined
          const str = String(rawDate).trim()
          if (!str) return undefined

          if (/^\d{5}$/.test(str) || (typeof rawDate === 'number' && rawDate > 30000 && rawDate < 60000)) {
            const num = Number(rawDate)
            const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000))
            return jsDate.toISOString()
          }

          const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
          if (match) {
            const [, day, month, year] = match
            const jsDate = new Date(Number(year), Number(month) - 1, Number(day))
            return jsDate.toISOString()
          }

          const parsed = new Date(str)
          return Number.isNaN(parsed.getTime()) ? str : parsed.toISOString()
        }

        const rawAccNameCandidate = getVal('Account Name', 'AccountName', 'Customer Name', 'customerName', 'Company Name', 'companyName', 'Company', 'company', 'Client Name', 'clientName', 'Name', 'name', 'Account')
        const accountName = isCodePatternStr(rawAccNameCandidate) ? '' : rawAccNameCandidate

        const rawDateInput = getVal('Account Date', 'Date', 'accountDate')
        const accountDate = parseExcelDateValue(rawDateInput) || rawDateInput || undefined
        const accountCategory = getVal('Account Category', 'AccountCategory', 'Category', 'accountCategory')
        const contactPerson = getVal('Contact Person', 'ContactPerson', 'Contact', 'contactPerson')
        const phone = getVal('Phone', 'phone', 'Mobile', 'mobile', 'Contact Mobile')
        const email = sanitizeEmail(getVal('Email', 'email', 'Contact Email'))
        const alternatePhone = getVal('Alternate Phone', 'alternatePhone')
        const alternateEmail = sanitizeEmail(getVal('Alternate Email', 'alternateEmail'))
        const customerType = getVal('Customer Type', 'customerType')
        const projectName = getVal('Project Name', 'ProjectName', 'Project', 'project', 'company')
        const productCategory = getVal('Product Category', 'productCategory')
        const state = getVal('State', 'state')
        const location = getVal('Location', 'location', 'City', 'city')
        const industryType = getVal('Industry type', 'Industry Type', 'IndustryType', 'Industry', 'industry')
        const jobNo = getVal('Job No', 'JobNo', 'Job No.', 'Customer Ref. No.', 'Customer Ref No', 'CustomerRefNo')
        const customerRefNo = jobNo || getVal('Customer Ref. No.', 'Customer Ref No', 'CustomerRefNo')
        const consultantName = getVal('Consultant Name', 'consultantName')
        const poValue = getVal('PO Value', 'poValue', 'POValue')
        const userGroup = getVal('User Group', 'userGroup', 'UserGroup')

        const fallbackRowName = Object.values(row)
          .map((v) => String(v || '').trim())
          .find((val) => val.length > 1 && !isCodePatternStr(val) && !/^\d+$/.test(val) && !/Report Filter/i.test(val)) || ''

        const displayName = (
          (accountName && !isCodePatternStr(accountName) ? accountName : null) ||
          (projectName && !isCodePatternStr(projectName) ? projectName : null) ||
          (customerRefNo && !isCodePatternStr(customerRefNo) ? customerRefNo : null) ||
          (fallbackRowName ? fallbackRowName : null) ||
          ''
        )
        if (!displayName) continue
        if (/Report Filter/i.test(displayName) || /Report Filter/i.test(accountName)) continue

        const matchingLead = existingLeads.find((lead) => {
          if (!lead) return false
          if (customerRefNo && (lead.customerRefNo === customerRefNo || lead.formData?.customerRefNo === customerRefNo)) return true
          if (displayName && (lead.name === displayName || lead.customerName === displayName || lead.accountName === displayName)) return true
          return false
        })

        if (matchingLead && matchingLead.id) {
          try {
            await leadApi.deleteLead(matchingLead.id)
          } catch (deleteErr) {
            console.warn(`Could not remove matching lead ${matchingLead.id} before import:`, deleteErr)
          }
        }

        const payload = {
          name: displayName,
          accountName: displayName,
          customerName: displayName,
          accountNumber: loggedInOwnerCode,
          accountNo: loggedInOwnerCode,
          account_no: loggedInOwnerCode,
          ownerCode: loggedInOwnerCode,
          accountOwnerCode: loggedInOwnerCode,
          accountOwner: loggedInUserName,
          ownerName: loggedInUserName,
          createdBy: loggedInUserId,
          ownerUserId: loggedInUserId,
          assignedTo: loggedInUserId,
          customerRefNo: customerRefNo || undefined,
          jobNo: jobNo || undefined,
          accountDate: accountDate || undefined,
          accountCategory: accountCategory || undefined,
          contactPerson: contactPerson || undefined,
          phone: phone || undefined,
          mobile: phone || undefined,
          email: email || undefined,
          alternatePhone: alternatePhone || undefined,
          alternateEmail: alternateEmail || undefined,
          customerType: customerType || undefined,
          projectName: projectName || undefined,
          company: projectName || undefined,
          productCategory: productCategory || undefined,
          state: state || undefined,
          location: location || undefined,
          industryType: industryType || undefined,
          consultantName: consultantName || undefined,
          poValue: poValue || undefined,
          userGroup: userGroup || undefined,
          status: 'pending',
          isExcelImport: true,
          formData: {
            'Account Name': displayName,
            'Account Date': accountDate,
            'Account Category': accountCategory,
            'Account Owner': loggedInUserName,
            'Contact Person': contactPerson,
            'Phone': phone,
            'Email': email,
            'Alternate Phone': alternatePhone,
            'Alternate Email': alternateEmail,
            'Customer Type': customerType,
            'Project Name': projectName,
            'Product Category': productCategory,
            'State': state,
            'Location': location,
            'Industry type': industryType,
            'Customer Ref. No.': customerRefNo,
            'Job No': jobNo,
            'Consultant Name': consultantName,
            'PO Value': poValue,
            'User Group': userGroup,
            accountName: displayName,
            accountDate,
            accountCategory,
            accountOwner: loggedInUserName,
            ownerCode: loggedInOwnerCode,
            accountOwnerCode: loggedInOwnerCode,
            contactPerson,
            phone,
            email,
            alternatePhone,
            alternateEmail,
            customerType,
            projectName,
            productCategory,
            state,
            location,
            industryType,
            customerRefNo,
            jobNo,
            consultantName,
            poValue,
            userGroup,
            accountNo: loggedInOwnerCode,
            accountNumber: loggedInOwnerCode,
          },
        }

        payloadsToImport.push({
          ...payload,
          targetCollection: 'accounts',
        })
      }

      let insertedCount = 0
      let duplicateCount = 0

      if (payloadsToImport.length > 0) {
        try {
          const res = await dealApi.importDeals(payloadsToImport)
          const dataObj = res?.data || res || {}
          insertedCount = dataObj.insertedCount ?? dataObj.count ?? res?.count ?? 0
          duplicateCount = dataObj.duplicateCount ?? 0
        } catch (bulkErr) {
          console.warn('Batch import fallback in AccountBoardHeaderActions:', bulkErr)
          for (const p of payloadsToImport) {
            try {
              await leadApi.createLead(p)
              insertedCount += 1
            } catch (err) {
              console.error('Failed fallback single import:', err)
            }
          }
        }
      }

      if (onRefresh) {
        await onRefresh()
      }

      if (insertedCount > 0) {
        alert(`Import completed successfully! ${insertedCount} account records stored in MongoDB.`)
      } else {
        alert(`Import completed: 0 account records stored in MongoDB.`)
      }
    } catch (err) {
      console.error('Error reading import file:', err)
      alert('Error parsing import file. Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const togglePendingKey = (currentKeys, key) => (
    currentKeys.includes(key)
      ? currentKeys.filter((entry) => entry !== key)
      : [...currentKeys, key]
  )

  const handleBulkClick = () => {
    setOpenMenu((currentValue) => {
      if (currentValue === 'bulk') {
        setBulkMenuPosition(null)
        return null
      }

      const triggerElement = bulkTriggerRef.current
      if (triggerElement) {
        const rect = triggerElement.getBoundingClientRect()
        const viewportPadding = 12
        const menuWidth = 320
        const menuHeight = 150
        const left = Math.min(
          Math.max(viewportPadding, rect.right - menuWidth),
          window.innerWidth - menuWidth - viewportPadding
        )
        const spaceBelow = window.innerHeight - rect.bottom
        const top = spaceBelow >= menuHeight + viewportPadding
          ? rect.bottom + 4
          : Math.max(viewportPadding, rect.top - menuHeight - 4)
        setBulkMenuPosition({ top, left, width: menuWidth })
      }

      return 'bulk'
    })
  }

  const bulkDisabled = selectedCount === 0

  const handleBulkItemClick = (action) => {
    if (bulkDisabled) return
    closeMenu()
    action?.()
  }

  return (
    <div className="account-board-header-actions" ref={activeMenuRef}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls, .csv"
        style={{ display: 'none' }}
        onChange={handleImportFileSelect}
      />

      {SHOW_BULK_ACTIONS && actions.showBulk ? (
        <div className="account-board-header-menu-wrap">
          <button
            ref={bulkTriggerRef}
            type="button"
            className="account-board-header-btn account-board-header-btn-bulk"
            onClick={handleBulkClick}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'bulk'}
          >
            <span className="account-board-header-btn-label">
              <FiLayers />
              <span>Bulk Actions{selectedCount > 0 ? ` (${selectedCount})` : ''}</span>
            </span>
            <FiChevronDown className={`account-board-header-btn-caret${openMenu === 'bulk' ? ' account-board-header-btn-caret-open' : ''}`} />
          </button>

          {openMenu === 'bulk' && bulkMenuPosition ? createPortal(
            (
              <div
                className="account-board-header-menu account-board-header-menu-wide account-board-header-bulk-menu account-board-header-bulk-menu-portal"
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: `${bulkMenuPosition.top}px`,
                  left: `${bulkMenuPosition.left}px`,
                  right: 'auto',
                  width: `${bulkMenuPosition.width}px`,
                  zIndex: 2147483600,
                }}
              >
                <button
                  type="button"
                  className="account-board-header-menu-item account-board-header-bulk-item"
                  onClick={() => handleBulkItemClick(onBulkAddRemark)}
                  disabled={bulkDisabled}
                >
                  <FiEdit3 className="account-board-header-bulk-item-icon" />
                  <span className="account-board-header-bulk-item-label">Add Remark</span>
                </button>
                <button
                  type="button"
                  className="account-board-header-menu-item account-board-header-bulk-item"
                  onClick={() => handleBulkItemClick(onBulkReAssign)}
                  disabled={bulkDisabled}
                >
                  <FiUserCheck className="account-board-header-bulk-item-icon" />
                  <span className="account-board-header-bulk-item-label">Re-Assign</span>
                </button>
              </div>
            ),
            document.body
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="account-board-header-btn account-board-header-icon-btn-green"
        title="Import accounts (.xlsx, .xls, .csv)"
        aria-label="Import accounts"
        disabled={isImporting}
        onClick={handleImportClick}
        style={{ padding: '0 0.6rem', fontSize: '0.82rem', fontWeight: 600, height: '2.2rem' }}
      >
        <FiUpload />
        <span>{isImporting ? 'Importing...' : 'Import'}</span>
      </button>

      {actions.showColumnsIcon ? (
        <div className="account-board-header-menu-wrap">
          <button
            type="button"
            className="account-board-header-icon-btn account-board-header-icon-btn-blue"
            title="List/View"
            aria-label="List/View"
            onClick={() => setOpenMenu((currentValue) => currentValue === 'columns' ? null : 'columns')}
          >
            <FiList />
          </button>

          {openMenu === 'columns' ? (
            <div className="account-board-header-menu">
              {allColumns.map((column) => {
                const isChecked = pendingColumnKeys.includes(column.key)

                return (
                  <button
                    key={column.key}
                    type="button"
                    className={`account-board-header-check-item${isChecked ? ' account-board-header-check-item-active' : ''}`}
                    onClick={() => setPendingColumnKeys((currentValue) => togglePendingKey(currentValue, column.key))}
                  >
                    <span className={`account-board-header-check-box ${isChecked ? 'account-board-header-check-box-active' : ''}`}>
                      {isChecked ? <FiCheck /> : null}
                    </span>
                    <span>{column.label}</span>
                  </button>
                )
              })}

              <button
                type="button"
                className="account-board-header-load-btn"
                onClick={() => {
                  onApplyVisibleColumns(pendingColumnKeys.length > 0 ? pendingColumnKeys : allColumns.map((column) => column.key))
                  closeMenu()
                }}
              >
                Load <FiChevronDown className="account-board-header-load-icon" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {actions.showFilterIcon ? (
        <button
          type="button"
          className="account-board-header-icon-btn account-board-header-icon-btn-filter"
          title={filterButtonTitle || (showFilters ? 'Hide Filters' : 'Show Filters')}
          aria-label={filterButtonTitle || (showFilters ? 'Hide Filters' : 'Show Filters')}
          onClick={onToggleFilters}
        >
          <FiFilter />
        </button>
      ) : null}

      {actions.showRefreshIcon ? (
        <button
          type="button"
          className="account-board-header-icon-btn account-board-header-icon-btn-refresh"
          title={refreshButtonTitle}
          aria-label={refreshButtonTitle}
          onClick={onRefresh}
        >
          <FiRefreshCw />
        </button>
      ) : null}

      <button
        type="button"
        className="account-board-header-icon-btn account-board-header-icon-btn-import"
        title="Import Accounts Excel"
        aria-label="Import Accounts Excel"
        onClick={handleImportClick}
        disabled={isImporting}
      >
        <FiUpload />
      </button>

      {actions.showLoadMenu ? (
        <div className="account-board-header-menu-wrap">
          <button
            type="button"
            className="account-board-header-icon-btn account-board-header-icon-btn-cyan account-board-header-icon-btn-with-caret"
            title="Column/Grid"
            aria-label="Column/Grid"
            onClick={() => setOpenMenu((currentValue) => currentValue === 'load' ? null : 'load')}
          >
            <span className="account-board-header-icon-btn-shell">
              <FiGrid />
              <FiChevronDown className={`account-board-header-inline-caret${openMenu === 'load' ? ' account-board-header-inline-caret-open' : ''}`} />
            </span>
          </button>

          {openMenu === 'load' ? (
            <div className="account-board-header-menu account-board-header-menu-source">
              {sourceStageOptions.map((stage) => {
                const isChecked = pendingSourceKeys.includes(stage.key)

                return (
                  <button
                    key={stage.key}
                    type="button"
                    className={`account-board-header-check-item${isChecked ? ' account-board-header-check-item-active' : ''}`}
                    onClick={() => setPendingSourceKeys((currentValue) => togglePendingKey(currentValue, stage.key))}
                  >
                    <span className={`account-board-header-check-box ${isChecked ? 'account-board-header-check-box-active' : ''}`}>
                      {isChecked ? <FiCheck /> : null}
                    </span>
                    <span>{stage.label}</span>
                  </button>
                )
              })}

              <button
                type="button"
                className="account-board-header-load-btn"
                onClick={() => {
                  onApplyVisibleSourceStages?.(pendingSourceKeys.length > 0 ? pendingSourceKeys : sourceStageOptions.map((stage) => stage.key))
                  closeMenu()
                }}
              >
                Load <FiChevronDown className="account-board-header-load-icon" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {actions.showMoreMenu ? (
        <div className="account-board-header-menu-wrap">
          <button
            type="button"
            className="account-board-header-icon-btn account-board-header-icon-btn-blue"
            title="More"
            onClick={() => setOpenMenu((currentValue) => currentValue === 'more' ? null : 'more')}
          >
            <FiChevronDown />
          </button>

          {openMenu === 'more' ? (
            <div className="account-board-header-menu">
              {moreMenuOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="account-board-header-menu-item"
                  onClick={option.onClick}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        onChange={handleImportFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default AccountBoardHeaderActions
