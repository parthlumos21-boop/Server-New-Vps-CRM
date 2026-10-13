import * as XLSX from 'xlsx'
import { leadApi } from '../services/leadApi'
import { dealApi } from '../services/dealApi'
import { quotationApi } from '../services/quotationApi'
import { authService } from '../services/authService'
import {
  GROUP_ACCOUNTS_COLUMNS,
  getColumnTextValue,
} from '../features/adminAccounts/config/accountBoardColumns'

/**
 * Normalizes string values for case-insensitive matching.
 */
const normalizeMatchValue = (value) =>
  String(value || '').trim().toLowerCase()

/**
 * Resolves Quotation Owner Name from a quotation record, inspecting all candidate fields
 * with fallback to user directory by userId/createdBy.
 */
const getQuotationOwnerNameFromRecord = (quotation = {}, availableUsers = []) => {
  const rawOwner = quotation.selectedAccountOwner
    || quotation.data?.selectedAccountOwner
    || quotation.quotationOwnerName
    || quotation.quotationOwner
    || quotation.createdByName
    || quotation.ownerName
    || quotation.addedByName
    || quotation.data?.quotationOwnerName
    || quotation.data?.quotationOwner
    || ''
  if (rawOwner && String(rawOwner).trim()) {
    return String(rawOwner).trim()
  }

  const userId = String(quotation.userId || quotation.createdBy || quotation.data?.userId || quotation.data?.createdBy || '').trim()
  if (!userId) return ''

  const matchedUser = (availableUsers || []).find((entry) => (
    [entry.id, entry._id, entry.legacyId].some((candidate) => String(candidate || '') === userId)
  ))
  return String(matchedUser?.name || matchedUser?.username || matchedUser?.email || '').trim()
}

/**
 * Resolves Quotation Number from a quotation record.
 */
const getQuotationNumberFromRecord = (quotation = {}) => (
  String(
    quotation.quoteNumber
    || quotation.quotationNumber
    || quotation.data?.quoteNumber
    || quotation.data?.quotationNumber
    || ''
  ).trim()
)

/**
 * Computes a similarity score between a quotation and an account/lead,
 * exactly matching the algorithm in MyGroupAccountsPage.jsx.
 */
const getQuotationScoreForAccount = (quotation = {}, account = {}) => {
  const raw = account.raw || account || {}
  const formData = account.formData || raw.formData || {}

  const qDealId = String(quotation.dealId || quotation.data?.dealId || quotation.selectedDealId || '').trim()
  const aDealId = String(account.dealId || account.convertedDealId || raw.dealId || raw.convertedDealId || '').trim()

  const qCustId = String(quotation.customerId || quotation.accountId || quotation.selectedAccountId || quotation.data?.selectedAccountId || '').trim()
  const aCustId = String(account.id || account._id || raw.id || raw._id || '').trim()

  const qProj = normalizeMatchValue(quotation.projectName || quotation.title || quotation.data?.projectName || quotation.data?.quotationSubject)
  const aProj = normalizeMatchValue(account.projectName || account.dealName || raw.projectName || formData.projectName)

  const qComp = normalizeMatchValue(quotation.companyName || quotation.clientName || quotation.customerName || quotation.data?.companyName || quotation.data?.clientName)
  const aComp = normalizeMatchValue(account.name || account.accountName || account.customerName || raw.name || formData['Account Name'])

  let score = 0
  if (qDealId && aDealId && qDealId === aDealId) score += 100
  if (qCustId && aCustId && qCustId === aCustId) score += 50
  if (qProj && aProj && qProj === aProj) score += 30
  if (qComp && aComp && qComp === aComp) score += 10

  return score
}

/**
 * Automatically calculates column widths (wch) based on header and cell content length,
 * adding comfortable visual padding so that columns auto-stretch when opened in Excel.
 */
const calculateAutoFitColumnWidths = (rows = []) => {
  if (!rows || rows.length === 0) return []
  const colKeys = Object.keys(rows[0] || {})

  return colKeys.map((key) => {
    let maxLength = String(key || '').trim().length
    for (let i = 0; i < rows.length; i++) {
      const cellVal = rows[i][key]
      if (cellVal !== null && cellVal !== undefined) {
        const str = String(cellVal).trim()
        if (str.length > maxLength) {
          maxLength = str.length
        }
      }
    }
    // Add +4 characters padding, clamped between min 12 and max 65
    return { wch: Math.min(Math.max(maxLength + 4, 12), 65) }
  })
}

/**
 * Enterprise CRM utility to download all data from MongoDB leads, deals, and quotations collections
 * into an Excel (.xlsx) file, mirroring the frontend column structure and formatters.
 *
 * @param {Object} options
 * @param {'accounts' | 'deals'} options.primary - Which sheet should be Sheet 1 in the workbook.
 */
export const exportAllAccountsAndDealsWorkbook = async ({ primary = 'accounts' } = {}) => {
  // 1. Concurrently fetch full data from MongoDB leads, deals, and quotations collections
  const [leads, deals, quotations] = await Promise.all([
    leadApi.getLeads().catch((err) => {
      console.warn('Failed to fetch leads from MongoDB for export:', err)
      return []
    }),
    dealApi.getDeals().catch((err) => {
      console.warn('Failed to fetch deals from MongoDB for export:', err)
      return []
    }),
    quotationApi.getQuotations().catch((err) => {
      console.warn('Failed to fetch quotations from MongoDB for export:', err)
      return []
    }),
  ])

  // Get available users for resolving quotation userId to real name
  const availableUsers = (typeof authService?.getAvailableUsers === 'function' ? authService.getAvailableUsers() : []) || []

  // 2. Build multi-attribute quotation lookups for Deals
  const quotationOwnerByDealId = {}
  const quotationNumberByDealId = {}
  const quotationOwnerByDealNumber = {}
  const quotationNumberByDealNumber = {}
  const quotationOwnerByCustomer = {}
  const quotationNumberByCustomer = {}
  const quotationOwnerByProject = {}
  const quotationNumberByProject = {}

  ;(quotations || []).forEach((q) => {
    const owner = getQuotationOwnerNameFromRecord(q, availableUsers)
    const num = getQuotationNumberFromRecord(q)

    const dealIds = [
      q.dealId,
      q.selectedDealId,
      q.linkedDealId,
      q.sourceDealId,
      q.data?.dealId,
      q.data?.selectedDealId,
      q.data?.linkedDealId,
    ]
    dealIds.forEach((did) => {
      const key = String(did || '').trim()
      if (key) {
        if (owner && !quotationOwnerByDealId[key]) quotationOwnerByDealId[key] = owner
        if (num && !quotationNumberByDealId[key]) quotationNumberByDealId[key] = num
      }
    })

    const dealNumbers = [
      q.dealNumber,
      q.selectedDealNumber,
      q.linkedDealNumber,
      q.data?.dealNumber,
      q.data?.selectedDealNumber,
      q.data?.linkedDealNumber,
    ]
    dealNumbers.forEach((dnum) => {
      const key = String(dnum || '').trim()
      if (key) {
        if (owner && !quotationOwnerByDealNumber[key]) quotationOwnerByDealNumber[key] = owner
        if (num && !quotationNumberByDealNumber[key]) quotationNumberByDealNumber[key] = num
      }
    })

    const custKey = String(q.customerId || q.accountId || q.selectedAccountId || q.data?.selectedAccountId || '').trim()
    if (custKey) {
      if (owner && !quotationOwnerByCustomer[custKey]) quotationOwnerByCustomer[custKey] = owner
      if (num && !quotationNumberByCustomer[custKey]) quotationNumberByCustomer[custKey] = num
    }

    const projKey = normalizeMatchValue(q.projectName || q.title || q.data?.projectName || q.data?.quotationSubject)
    if (projKey) {
      if (owner && !quotationOwnerByProject[projKey]) quotationOwnerByProject[projKey] = owner
      if (num && !quotationNumberByProject[projKey]) quotationNumberByProject[projKey] = num
    }
  })

  // 3. Format Accounts rows matching frontend table columns with quotation enrichment
  const accountsSheetRows = (leads || []).map((lead, idx) => {
    const rowObj = { 'Sr. No.': idx + 1 }

    // Match best quotation from MongoDB quotations collection
    const matchedQuotations = (quotations || [])
      .map((q) => ({ q, score: getQuotationScoreForAccount(q, lead) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return new Date(right.q.updatedAt || right.q.createdAt || 0).getTime() - new Date(left.q.updatedAt || left.q.createdAt || 0).getTime()
      })

    const bestQuotation = matchedQuotations[0]?.q
    const resolvedQuotationNumber = bestQuotation
      ? getQuotationNumberFromRecord(bestQuotation)
      : ''
    const resolvedQuotationOwner = bestQuotation
      ? getQuotationOwnerNameFromRecord(bestQuotation, availableUsers)
      : ''

    const enrichedLead = {
      ...lead,
      quotationNumber: resolvedQuotationNumber || lead.quotationNumber || lead.quoteNumber || lead.raw?.quotationNumber || '',
      quotationOwnerName: resolvedQuotationOwner || lead.quotationOwnerName || lead.quotationOwner || lead.raw?.quotationOwnerName || '',
      quotationOwner: resolvedQuotationOwner || lead.quotationOwner || lead.quotationOwnerName || lead.raw?.quotationOwner || '',
    }

    GROUP_ACCOUNTS_COLUMNS.forEach((col) => {
      let val = getColumnTextValue(col, enrichedLead)
      if (col.key === 'quotationOwnerName') {
        val = resolvedQuotationOwner || val || '-'
      } else if (col.key === 'quotationNumber') {
        val = resolvedQuotationNumber || val || '-'
      }
      rowObj[col.label] = (val && String(val).trim()) ? String(val).trim() : '-'
    })
    return rowObj
  })

  // 4. Format Deals rows matching frontend table columns with quotation enrichment
  const dealsSheetRows = (deals || []).map((deal, idx) => {
    const rowObj = { 'Sr. No.': idx + 1 }

    // Resolve Deal Number format (e.g. DL-00001)
    const rawNumber = deal.dealNumber || deal.number || deal.id || ''
    const dealNumberDisplay = rawNumber && /^DL-\d+$/i.test(String(rawNumber).trim())
      ? String(rawNumber).trim().toUpperCase()
      : (typeof rawNumber === 'number'
          ? `DL-${String(rawNumber).padStart(5, '0')}`
          : String(rawNumber || `DL-${String(idx + 1).padStart(5, '0')}`))

    // Resolve Date
    const rawDate = deal.dealDate || deal.createdAt || deal.quotationDate || ''
    let dealDateDisplay = '-'
    if (rawDate) {
      const d = new Date(rawDate)
      if (!Number.isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        dealDateDisplay = `${dd}-${mm}-${yyyy}`
      }
    }

    // Resolve Project & Customer Name
    const projectNameDisplay = deal.projectName || deal.title || deal.name || deal.data?.projectName || '-'
    const customerNameDisplay = deal.customerName || deal.accountName || deal.companyName || deal.data?.customerName || '-'

    // Resolve Deal Value Currency
    const dealVal = deal.amount ?? deal.value ?? deal.dealValue ?? null
    const dealValueDisplay = (dealVal !== null && dealVal !== undefined && dealVal !== '')
      ? `₹${Number(dealVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-'

    // Resolve PO Value Currency
    const poVal = deal.poValue ?? deal.data?.poValue ?? null
    const poValueDisplay = (poVal !== null && poVal !== undefined && poVal !== '')
      ? `₹${Number(poVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-'

    // Resolve Quotation Number and Owner from MongoDB quotations lookup
    const dealIdKey = String(deal.id || deal._id || deal.dealId || '').trim()
    const dealNumKey = String(deal.dealNumber || deal.number || '').trim()
    const custKey = String(deal.customerId || deal.accountId || '').trim()
    const projKey = normalizeMatchValue(deal.projectName || deal.title || deal.name)

    const resolvedQuotationOwner =
      (dealIdKey && quotationOwnerByDealId[dealIdKey])
      || (dealNumKey && quotationOwnerByDealNumber[dealNumKey])
      || deal.quotationOwnerName
      || deal.quotationOwner
      || deal.data?.quotationOwnerName
      || deal.data?.quotationOwner
      || (custKey && quotationOwnerByCustomer[custKey])
      || (projKey && quotationOwnerByProject[projKey])
      || '-'

    const resolvedQuotationNo =
      (dealIdKey && quotationNumberByDealId[dealIdKey])
      || (dealNumKey && quotationNumberByDealNumber[dealNumKey])
      || deal.quotationNumber
      || deal.quoteNo
      || deal.data?.quotationNumber
      || (custKey && quotationNumberByCustomer[custKey])
      || (projKey && quotationNumberByProject[projKey])
      || '-'

    rowObj['Deal No.'] = dealNumberDisplay
    rowObj['Project Name'] = projectNameDisplay
    rowObj['Deal Date'] = dealDateDisplay
    rowObj['Deal Owner'] = deal.dealOwnerDisplay || deal.dealOwner || deal.ownerName || '-'
    rowObj['Deal Type'] = deal.dealType || '-'
    rowObj['Deal Status'] = deal.stage || deal.status || 'New'
    rowObj['Deal Value'] = dealValueDisplay
    rowObj['Status Of Customer as per Quotation Given'] = deal.quotationCustomerStatus || deal.data?.quotationCustomerStatus || '-'
    rowObj['Status Of Customer as per Order Received'] = deal.orderCustomerStatus || deal.data?.orderCustomerStatus || '-'
    rowObj['PO Value'] = poValueDisplay
    rowObj['Job No.'] = deal.jobNo || deal.data?.jobNo || '-'
    rowObj['Quotation No.'] = resolvedQuotationNo
    rowObj['Quotation Owner Name'] = resolvedQuotationOwner
    rowObj['Customer Name'] = customerNameDisplay
    rowObj['Lost Order Reason'] = deal.reasonForLostOrder || deal.reasonForLost || deal.data?.reasonForLostOrder || '-'

    return rowObj
  })

  // 5. Create XLSX Workbook with Auto-Fit Column Widths
  const workbook = XLSX.utils.book_new()
  const accountsSheet = XLSX.utils.json_to_sheet(accountsSheetRows)
  const dealsSheet = XLSX.utils.json_to_sheet(dealsSheetRows)

  // Configure automatic column width stretch (auto-fit)
  accountsSheet['!cols'] = calculateAutoFitColumnWidths(accountsSheetRows)
  dealsSheet['!cols'] = calculateAutoFitColumnWidths(dealsSheetRows)

  const dateStamp = new Date().toISOString().slice(0, 10)

  if (primary === 'deals') {
    // Primary Sheet 1: Deals, Sheet 2: Accounts
    XLSX.utils.book_append_sheet(workbook, dealsSheet, 'Deals')
    XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts')
    XLSX.writeFile(workbook, `Deals_Leads_Export_${dateStamp}.xlsx`)
  } else {
    // Primary Sheet 1: Accounts, Sheet 2: Deals
    XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts')
    XLSX.utils.book_append_sheet(workbook, dealsSheet, 'Deals')
    XLSX.writeFile(workbook, `Accounts_Leads_Deals_Export_${dateStamp}.xlsx`)
  }

  return {
    accountsCount: accountsSheetRows.length,
    dealsCount: dealsSheetRows.length,
    quotationsCount: (quotations || []).length,
  }
}

export default exportAllAccountsAndDealsWorkbook
