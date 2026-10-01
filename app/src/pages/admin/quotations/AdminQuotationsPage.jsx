import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClone,
  FaDownload,
  FaEye,
  FaEllipsisV,
  FaEdit,
  FaFilePdf,
  FaPlus,
  FaPrint,
  FaSearch,
  FaSearchMinus,
  FaSearchPlus,
  FaSort,
  FaTimes,
  FaTrash,
  FaUpload,
  FaUserFriends,
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeAccountRecord } from '../../../features/adminAccounts/adapters/normalizeAccountRecord';
import { compareAccountsByNumberAsc } from '../../../features/adminAccounts/selectors/getAccountsBoardData';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { exportExcelWorkbook, exportCsvWorkbook } from '../../../utils/excelExport';
import { formatCurrency } from '../../../utils/helpers';
import { customViewApi } from '../../../services/customViewApi';
import { quotationApi } from '../../../services/quotationApi';
import { ExcelExportActionButton, ExcelExportMenuButton } from '../../../components/common/ExcelExportButton';
import './AdminQuotationsPage.css';
import {
  PAGE_SIZE,
  ACCOUNT_LIST_PAGE_SIZE,
  ADMIN_QUOTATION_LAYOUT_STORAGE_KEY,
  ADMIN_QUOTATION_LAYOUT_VIEW_ENTITY_TYPE,
  ADMIN_QUOTATION_LAYOUT_VIEW_NAME,
  MAX_UPLOAD_QUOTATION_FILE_SIZE,
  ALLOWED_UPLOAD_QUOTATION_EXTENSIONS,
  INITIAL_FILTERS,
  INITIAL_ACCOUNT_FILTERS,
  UPLOAD_QUOTATION_STATUS_OPTIONS,
  QUOTATION_CURRENCY_OPTIONS,
  getTodayInputValue,
  addDaysToInputValue,
  createInitialUploadQuotationForm,
  ADMIN_QUOTATION_FIELD_DEFINITIONS,
  ADMIN_QUOTATION_MANAGER_EXPORT_COLUMNS,
  DEFAULT_SELECTED_ADMIN_QUOTATION_FIELDS,
  orderQuotationNumberFirst,
  readAdminQuotationLayout,
  sanitizeAdminQuotationLayout,
  SWATI_PROFILE_FALLBACK,
  LUMOS_PROFILE_FALLBACK,
  PROFILE_FALLBACKS,
  ACTIONS,
  safeLower,
  splitDisplayLines,
  buildUploadAccountAddress,
  getUploadQuotationFileExtension,
  validateUploadQuotationFile,
  getProfileFallback,
  isSwatiProfile,
  isLumosProfile,
  getBrandLogoSource,
  getBrandClassName,
  isImageProfile,
  formatListDate,
  formatDocumentDate,
  toNumber,
  escapeHtml,
  normalizeStatusKey,
  formatStatusLabel,
  getStatusClassName,
  getActionBadgeClassName,
  getUserIdentityValues,
  getAllowedQuotationActionKeys,
  getAllowedQuotationActions,
  buildVisiblePages,
  sectionValue,
  displayValue,
  buildAddress,
  buildLineItems,
  numberToWordsBelowThousand,
  numberToWords,
  resolveLinkedAccount,
  buildQuotationDocumentData,
  VIEW_QUOTATION_LINE_ITEM_COLUMNS,
  buildQuotationViewExportOptions,
  buildPrintableHtml,
  triggerBrowserPdfSave,
  StatusBadge,
  ModalShell,
  EditableQuotationValue,
  renderEditableQuotationValue,
  QuotationDocument,
  QuotationPdfViewer,
} from './quotationShared';

const AdminQuotationsPage = ({ allowUsers = false, generatorPath = '/admin/quotations' }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    quotations,
    quotationsLoading,
    quotationsError,
    accounts,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    addNotification,
    loadQuotations,
  } = useData()

  // Access control: admins by default; user portal can opt in with safe routes.
  const isAuthorized = allowUsers || (user && (user.role === 'admin' || user.role === 'super_admin'))

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/unauthorized', { replace: true })
    }
  }, [isAuthorized, navigate])

  const [activeTab, setActiveTab] = useState('account')
  const [showFilterRow] = useState(false)
  const [isFieldPanelOpen, setIsFieldPanelOpen] = useState(false)
  const [quotationLayout, setQuotationLayout] = useState(readAdminQuotationLayout)
  const [fieldPanelDraft, setFieldPanelDraft] = useState(readAdminQuotationLayout)
  const [savedLayoutViewId, setSavedLayoutViewId] = useState('')
  const [draggedFieldKey, setDraggedFieldKey] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [page, setPage] = useState(1)
  const [isUploadQuotationOpen, setIsUploadQuotationOpen] = useState(false)
  const [isAccountListOpen, setIsAccountListOpen] = useState(false)
  const [uploadQuotationForm, setUploadQuotationForm] = useState(createInitialUploadQuotationForm)
  const [uploadQuotationErrors, setUploadQuotationErrors] = useState({})
  const [uploadQuotationMessage, setUploadQuotationMessage] = useState('')
  const [uploadQuotationSaving, setUploadQuotationSaving] = useState(false)
  const [accountFilters, setAccountFilters] = useState(INITIAL_ACCOUNT_FILTERS)
  const [accountListPage, setAccountListPage] = useState(1)
  const [previewRow, setPreviewRow] = useState(null)
  const [pdfRow, setPdfRow] = useState(null)
  const [viewRow, setViewRow] = useState(null)
  const [viewRowFromUrl, setViewRowFromUrl] = useState(false)
  const [accountRow, setAccountRow] = useState(null)
  const [approveRow, setApproveRow] = useState(null)
  const [rejectRow, setRejectRow] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const viewQuotationId = searchParams.get('view') || ''

  const selectedFieldDefinitions = useMemo(() => (
    orderQuotationNumberFirst(quotationLayout.selectedFields, activeTab)
      .map((fieldKey) => ADMIN_QUOTATION_FIELD_DEFINITIONS.find((field) => field.key === fieldKey))
      .filter(Boolean)
  ), [quotationLayout.selectedFields, activeTab])

  const availableFieldDefinitions = useMemo(() => (
    ADMIN_QUOTATION_FIELD_DEFINITIONS.filter((field) => !fieldPanelDraft.selectedFields.includes(field.key))
  ), [fieldPanelDraft.selectedFields])

  const normalizedAccounts = useMemo(
    () => accounts
      .map((account, index) => normalizeAccountRecord(account, index, { recordSource: 'admin-quotation-view' }))
      .sort(compareAccountsByNumberAsc),
    [accounts]
  )

  const selectedUploadAccount = useMemo(
    () => normalizedAccounts.find((account) => String(account.id) === String(uploadQuotationForm.selectedAccountId || '')) || null,
    [normalizedAccounts, uploadQuotationForm.selectedAccountId]
  )

  const filteredAccounts = useMemo(() => (
    normalizedAccounts.filter((account) => (
      Object.entries(accountFilters).every(([key, value]) => {
        const query = safeLower(value)
        if (!query) return true
        const resolvedValue = key === 'accountOwner'
          ? (account.accountOwnerDisplay || account.accountOwner || '')
          : account[key]
        return safeLower(resolvedValue).includes(query)
      })
    ))
  ), [accountFilters, normalizedAccounts])

  const totalAccountPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAccounts.length / ACCOUNT_LIST_PAGE_SIZE)),
    [filteredAccounts.length]
  )

  const visibleAccountPages = useMemo(
    () => buildVisiblePages(accountListPage, totalAccountPages),
    [accountListPage, totalAccountPages]
  )

  const paginatedAccounts = useMemo(() => {
    const start = (accountListPage - 1) * ACCOUNT_LIST_PAGE_SIZE
    return filteredAccounts.slice(start, start + ACCOUNT_LIST_PAGE_SIZE)
  }, [accountListPage, filteredAccounts])

  const rows = useMemo(() => {
    return quotations
      .map((quotation, index) => {
        const linkedAccount = resolveLinkedAccount(quotation, normalizedAccounts)
        const amountNumber = toNumber(quotation.amount)
          || buildLineItems(quotation).reduce((sum, item) => sum + toNumber(item.amount), 0)

        return {
          id: quotation.id || `quotation-${index}`,
          num: quotation.quotationNumber || `Quotation ${index + 1}`,
          owner: linkedAccount?.accountOwnerDisplay || quotation.selectedAccountOwner || linkedAccount?.accountOwner || '-',
          date: formatListDate(quotation.quotationDate || quotation.createdAt),
          dateSort: quotation.quotationDate || quotation.createdAt || '',
          company: quotation.companyName || linkedAccount?.name || quotation.clientName || '-',
          amount: amountNumber,
          amountLabel: formatCurrency(amountNumber, quotation.currency || 'INR'),
          status: quotation.status || 'draft',
          statusLabel: formatStatusLabel(quotation.status),
          project: quotation.projectName || quotation.product || quotation.otherProduct || quotation.otherService || '-',
          profileName: quotation.profileName || '-',
          linkedAccount,
          raw: quotation,
        }
      })
      .sort((left, right) => new Date(right.dateSort || 0).getTime() - new Date(left.dateSort || 0).getTime())
  }, [normalizedAccounts, quotations])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeTab !== 'account' && activeTab !== 'deal') {
        return false
      }

      return Object.entries(filters).every(([key, value]) => {
        const query = safeLower(value)
        if (!query) return true
        const rowValue = key === 'amount'
          ? `${row.amount} ${row.amountLabel}`
          : key === 'status'
            ? row.statusLabel
            : row[key]
        return safeLower(rowValue).includes(query)
      })
    })
  }, [activeTab, filters, rows])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE)), [filteredRows.length])
  const visiblePages = useMemo(() => buildVisiblePages(page, totalPages), [page, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, page])

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages))
  }, [totalPages])

  useEffect(() => {
    setAccountListPage((currentPage) => Math.min(currentPage, totalAccountPages))
  }, [totalAccountPages])

  useEffect(() => {
    let isActive = true

    const loadPersistedLayout = async () => {
      try {
        const views = await customViewApi.listCustomViews(ADMIN_QUOTATION_LAYOUT_VIEW_ENTITY_TYPE)
        if (!isActive) return

        const savedView = views.find((view) => view.name === ADMIN_QUOTATION_LAYOUT_VIEW_NAME) || null
        if (!savedView) return

        const nextLayout = sanitizeAdminQuotationLayout({
          selectedFields: savedView.columns,
        })

        setSavedLayoutViewId(String(savedView.id || ''))
        setQuotationLayout(nextLayout)
        setFieldPanelDraft(nextLayout)
        window.localStorage.setItem(ADMIN_QUOTATION_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout))
      } catch (_error) {
        // Keep local-storage fallback if the custom-view request is unavailable.
      }
    }

    loadPersistedLayout()
    return () => {
      isActive = false
    }
  }, [])

  const updateViewSearchParam = (quotationId) => {
    const nextParams = new URLSearchParams(searchParams)
    if (quotationId) {
      nextParams.set('view', quotationId)
    } else {
      nextParams.delete('view')
    }
    setSearchParams(nextParams, { replace: true })
  }

  const openUploadQuotationModal = () => {
    setUploadQuotationForm(createInitialUploadQuotationForm())
    setUploadQuotationErrors({})
    setUploadQuotationMessage('')
    setAccountFilters(INITIAL_ACCOUNT_FILTERS)
    setAccountListPage(1)
    setIsAccountListOpen(false)
    setIsUploadQuotationOpen(true)
  }

  const closeUploadQuotationModal = () => {
    if (uploadQuotationSaving) return

    setIsUploadQuotationOpen(false)
    setIsAccountListOpen(false)
    setUploadQuotationErrors({})
    setUploadQuotationMessage('')
  }

  const handleUploadQuotationFieldChange = (field, value) => {
    setUploadQuotationForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }))
    setUploadQuotationMessage('')
    setUploadQuotationErrors((currentValue) => {
      if (!currentValue[field]) return currentValue
      return { ...currentValue, [field]: '' }
    })
  }

  const handleOpenAccountList = () => {
    setUploadQuotationMessage('')
    setAccountFilters(INITIAL_ACCOUNT_FILTERS)
    setAccountListPage(1)
    setIsAccountListOpen(true)
  }

  const handleAccountFilterChange = (key, value) => {
    setAccountFilters((currentValue) => ({
      ...currentValue,
      [key]: value,
    }))
    setAccountListPage(1)
  }

  const handleUploadAccountSelect = (account) => {
    setUploadQuotationForm((currentValue) => ({
      ...currentValue,
      selectedAccountId: account.id || '',
      selectedAccountLabel: [account.accountNumber, account.name].filter(Boolean).join(' - '),
      clientAccountNumber: account.accountNumber || '',
      companyName: account.name || '',
      contactPerson: account.contactPerson || '',
      address: buildUploadAccountAddress(account),
      email: account.contactEmail || account.email || '',
      phone: account.contactMobile || account.contactPhone || account.phone || '',
      accountOwner: account.accountOwnerName || account.accountOwner || '',
    }))
    setUploadQuotationErrors((currentValue) => ({
      ...currentValue,
      selectedAccountId: '',
    }))
    setUploadQuotationMessage('')
    setIsAccountListOpen(false)
  }

  const handleUploadQuotationFileChange = (event) => {
    const file = event.target.files?.[0] || null
    const nextError = validateUploadQuotationFile(file)

    if (nextError) {
      setUploadQuotationForm((currentValue) => ({
        ...currentValue,
        quoteFile: null,
        quoteFileName: '',
      }))
      setUploadQuotationErrors((currentValue) => ({
        ...currentValue,
        quoteFile: nextError,
      }))
      event.target.value = ''
      return
    }

    setUploadQuotationForm((currentValue) => ({
      ...currentValue,
      quoteFile: file,
      quoteFileName: file?.name || '',
    }))
    setUploadQuotationErrors((currentValue) => ({
      ...currentValue,
      quoteFile: '',
    }))
    setUploadQuotationMessage('')
  }

  const handleUploadQuotationSave = async (event) => {
    event.preventDefault()
    if (uploadQuotationSaving) return

    const nextErrors = {}
    if (!uploadQuotationForm.selectedAccountId) nextErrors.selectedAccountId = 'Please select an account from Account List.'
    if (!uploadQuotationForm.quoteNumber.trim()) nextErrors.quoteNumber = 'Quote Number is required.'
    if (!uploadQuotationForm.quotationDate) nextErrors.quotationDate = 'Quotation Date is required.'
    if (!String(uploadQuotationForm.totalAmount).trim()) nextErrors.totalAmount = 'Total Amount is required.'
    if (!uploadQuotationForm.quotationStatus) nextErrors.quotationStatus = 'Quotation Status is required.'

    const fileError = validateUploadQuotationFile(uploadQuotationForm.quoteFile)
    if (fileError) nextErrors.quoteFile = fileError

    setUploadQuotationErrors(nextErrors)
    setUploadQuotationMessage('')
    if (Object.keys(nextErrors).length > 0) return

    const payload = {
      quotationNumber: uploadQuotationForm.quoteNumber.trim(),
      quotationDate: uploadQuotationForm.quotationDate,
      validUntil: uploadQuotationForm.validUntilDate || uploadQuotationForm.quotationDate,
      amount: Number.parseFloat(uploadQuotationForm.totalAmount) || 0,
      totalAmount: Number.parseFloat(uploadQuotationForm.totalAmount) || 0,
      taxAmount: Number.parseFloat(uploadQuotationForm.totalProductTax) || 0,
      productTax: Number.parseFloat(uploadQuotationForm.totalProductTax) || 0,
      currency: uploadQuotationForm.amountCurrency || 'INR',
      taxCurrency: uploadQuotationForm.taxCurrency || uploadQuotationForm.amountCurrency || 'INR',
      status: uploadQuotationForm.quotationStatus,
      clientName: uploadQuotationForm.contactPerson || uploadQuotationForm.companyName || uploadQuotationForm.clientAccountNumber,
      companyName: uploadQuotationForm.companyName,
      clientAccountNumber: uploadQuotationForm.clientAccountNumber,
      contactPerson: uploadQuotationForm.contactPerson,
      telephone: uploadQuotationForm.phone,
      email: uploadQuotationForm.email,
      clientAddressDetails: uploadQuotationForm.address,
      selectedAccountId: uploadQuotationForm.selectedAccountId,
      selectedAccountOwner: uploadQuotationForm.accountOwner,
      quotationFileName: uploadQuotationForm.quoteFile?.name || '',
      quotationFileSize: uploadQuotationForm.quoteFile?.size || 0,
      quotationFileType: uploadQuotationForm.quoteFile?.type || '',
      projectName: selectedUploadAccount?.projectName || uploadQuotationForm.companyName || uploadQuotationForm.clientAccountNumber,
    }

    setUploadQuotationSaving(true)
    const result = await createQuotation(payload)
    setUploadQuotationSaving(false)

    if (!result.success) {
      const isDuplicate = result.code === 'DUPLICATE_QUOTATION' || result.status === 409
      const message = result.message || 'Unable to upload quotation.'
      setUploadQuotationMessage(message)
      if (isDuplicate) {
        addNotification('warning', 'Duplicate quotation', message)
      } else {
        addNotification('error', 'Error', message)
      }
      return
    }

    addNotification('success', 'Success', 'Quotation uploaded successfully.')
    setActiveTab('account')
    setPage(1)
    setFilters(INITIAL_FILTERS)
    setIsUploadQuotationOpen(false)
    setIsAccountListOpen(false)
    setUploadQuotationForm(createInitialUploadQuotationForm())
    setUploadQuotationErrors({})
    setUploadQuotationMessage('')
  }

  const openQuotationView = (row, syncUrl = true) => {
    setViewRow(row)
    setViewRowFromUrl(syncUrl)
    if (syncUrl) {
      updateViewSearchParam(row.id)
    }
  }

  const closeQuotationView = () => {
    setViewRow(null)
    if (viewRowFromUrl || viewQuotationId) {
      setViewRowFromUrl(false)
      updateViewSearchParam('')
    }
  }

  const handleDeleteQuotation = async (doc) => {
    const q = doc || viewDocument
    if (!q?.id) return
    const confirmed = window.confirm(`Delete Quotation\n\nAre you sure you want to delete quotation "${q.quotationNumber || q.quoteNumber || q.id}"?`)
    if (!confirmed) return

    try {
      if (deleteQuotation) {
        await deleteQuotation(q.id)
      } else {
        await quotationApi.deleteQuotation(q.id)
      }
      addNotification?.('success', 'Quotation deleted', 'Quotation deleted successfully.')
      closeQuotationView()
      loadQuotations?.()
    } catch (error) {
      addNotification?.('error', 'Delete failed', error?.response?.data?.message || error?.message || 'Failed to delete quotation.')
    }
  }

  useEffect(() => {
    if (!viewQuotationId) {
      if (viewRowFromUrl) {
        setViewRow(null)
        setViewRowFromUrl(false)
      }
      return
    }

    const matchedRow = rows.find((row) => (
      String(row.id) === String(viewQuotationId)
      || String(row.raw?.id || '') === String(viewQuotationId)
    ))

    if (!matchedRow) return

    setViewRowFromUrl(true)
    setViewRow((currentValue) => (currentValue?.id === matchedRow.id ? currentValue : matchedRow))
  }, [rows, viewQuotationId, viewRowFromUrl])

  const buildRelatedQuotationRows = (account) => {
    if (!account) return []

    return rows.filter((row) => (
      String(row.raw.selectedAccountId || '') === String(account.id || '')
      || safeLower(row.raw.clientAccountNumber) === safeLower(account.accountNumber)
      || safeLower(row.company) === safeLower(account.name)
    ))
  }

  const openPdfPage = (row) => {
    setPdfRow(row)
  }

  const closePdfPage = () => {
    setPdfRow(null)
  }

  const handlePrintPdfPage = () => {
    triggerBrowserPdfSave(pdfDocument)
  }

  const handleDownloadPdfPage = () => {
    if (!pdfDocument) return
    triggerBrowserPdfSave(pdfDocument)
  }

  const handleOpenFieldPanel = () => {
    setFieldPanelDraft({
      selectedFields: [...quotationLayout.selectedFields],
    })
    setIsFieldPanelOpen(true)
  }

  const persistAdminQuotationLayout = async (layoutValue) => {
    const sanitizedLayout = sanitizeAdminQuotationLayout(layoutValue)
    const payload = {
      entityType: ADMIN_QUOTATION_LAYOUT_VIEW_ENTITY_TYPE,
      name: ADMIN_QUOTATION_LAYOUT_VIEW_NAME,
      columns: sanitizedLayout.selectedFields,
      filters: {},
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
  }

  const handleApplyFieldPanel = async (shouldPersist) => {
    if (fieldPanelDraft.selectedFields.length === 0) {
      addNotification('error', 'Field selection required', 'Select at least one quotation field.')
      return
    }

    const nextLayout = sanitizeAdminQuotationLayout(fieldPanelDraft)
    setQuotationLayout(nextLayout)
    if (shouldPersist) {
      window.localStorage.setItem(ADMIN_QUOTATION_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout))
      try {
        await persistAdminQuotationLayout(nextLayout)
      } catch (_error) {
        addNotification('warning', 'Saved locally', 'The quotation layout was saved in this browser, but database sync is unavailable right now.')
      }
    }
    setIsFieldPanelOpen(false)
  }

  const handleAddSelectedField = (fieldKey) => {
    setFieldPanelDraft((currentValue) => (
      currentValue.selectedFields.includes(fieldKey)
        ? currentValue
        : {
          ...currentValue,
          selectedFields: [...currentValue.selectedFields, fieldKey],
        }
    ))
  }

  const handleRemoveSelectedField = (fieldKey) => {
    setFieldPanelDraft((currentValue) => {
      if (currentValue.selectedFields.length <= 1) {
        return currentValue
      }

      return {
        ...currentValue,
        selectedFields: currentValue.selectedFields.filter((entry) => entry !== fieldKey),
      }
    })
  }

  const handleSelectedFieldDrop = (targetFieldKey) => {
    if (!draggedFieldKey || draggedFieldKey === targetFieldKey) return

    setFieldPanelDraft((currentValue) => {
      const currentIndex = currentValue.selectedFields.indexOf(draggedFieldKey)
      const targetIndex = currentValue.selectedFields.indexOf(targetFieldKey)
      if (currentIndex < 0 || targetIndex < 0) return currentValue

      const nextFields = [...currentValue.selectedFields]
      nextFields.splice(currentIndex, 1)
      nextFields.splice(targetIndex, 0, draggedFieldKey)

      return {
        ...currentValue,
        selectedFields: nextFields,
      }
    })
    setDraggedFieldKey('')
  }

  const handleExportRows = (format) => {
    const fileBase = `Quotation_Manager_${activeTab}_${new Date().toISOString().slice(0, 10)}`
    const managerMetadata = [
      { label: 'View', value: activeTab.toUpperCase() },
      { label: 'Total Records', value: String(filteredRows.length) },
      { label: 'Generated On', value: new Date().toLocaleString('en-IN') },
    ]

    const structuredExportRows = filteredRows.map((row) => ({
      date: row.dateSort || row.raw?.quotationDate || row.raw?.createdAt || '',
      owner: row.owner || '',
      company: row.company || '',
      project: row.project || '',
      num: row.num || '',
      amountLabel: row.amountLabel || '',
      statusLabel: row.statusLabel || formatStatusLabel(row.status),
      oldStatus: row.oldStatus || '',
      newStatus: row.newStatus || '',
      convertToPo: row.convertToPo || '',
      poValueJobNo: row.poValueJobNo || '',
      reasonForLostOrder: row.reasonForLostOrder || '',
    }))

    if (format === 'csv') {
      exportCsvWorkbook({
        filename: `${fileBase}.csv`,
        title: 'Quotation Manager',
        subtitle: `${activeTab.toUpperCase()} quotations`,
        sheetName: 'Quotation Manager',
        metadata: managerMetadata,
        columns: ADMIN_QUOTATION_MANAGER_EXPORT_COLUMNS,
        rows: structuredExportRows,
      })
      addNotification('success', 'CSV exported', 'Quotation manager data exported to CSV.')
      return
    }

    if (format === 'excel') {
      exportExcelWorkbook({
        filename: `${fileBase}.xlsx`,
        title: 'Quotation Manager',
        subtitle: `${activeTab.toUpperCase()} quotations`,
        sheetName: 'Quotation Manager',
        metadata: managerMetadata,
        columns: ADMIN_QUOTATION_MANAGER_EXPORT_COLUMNS,
        rows: structuredExportRows,
      })
      addNotification('success', 'Excel exported', 'Quotation manager data exported to Excel.')
    }
  }

  const handleApprove = async () => {
    if (!approveRow) return

    setActionLoadingId(approveRow.id)
    const result = await updateQuotation(approveRow.id, {
      status: 'approved',
      rejectionReason: '',
      approvedAt: new Date().toISOString(),
    })
    setActionLoadingId('')

    if (!result.success) {
      addNotification('error', 'Approval failed', result.message || 'Unable to approve this quotation.')
      return
    }

    setApproveRow(null)
    addNotification('success', 'Quotation approved', 'The quotation status has been updated to Approved.')
  }

  const handleRejectSubmit = async () => {
    const trimmedReason = rejectReason.trim()
    if (!trimmedReason) {
      setRejectError('Rejection reason is required.')
      return
    }

    if (!rejectRow) return

    setRejectError('')
    setActionLoadingId(rejectRow.id)
    const result = await updateQuotation(rejectRow.id, {
      status: 'rejected',
      rejectionReason: trimmedReason,
      rejectedAt: new Date().toISOString(),
    })
    setActionLoadingId('')

    if (!result.success) {
      addNotification('error', 'Reject failed', result.message || 'Unable to reject this quotation.')
      return
    }

    setRejectRow(null)
    setRejectReason('')
    addNotification('success', 'Quotation rejected', 'The quotation has been rejected and the reason was saved.')
  }

  const normalizeInlineCurrencyValue = (value) => {
    const numericValue = Number.parseFloat(String(value || '').replace(/[^\d.-]/g, ''))
    return Number.isFinite(numericValue) ? numericValue : 0
  }

  const buildInlineQuotationPatch = (rawQuotation = {}, fieldKey = '', value = '') => {
    if (fieldKey.startsWith('customerReference.')) {
      const [, nestedKey] = fieldKey.split('.')
      return {
        customerReference: {
          ...(rawQuotation.customerReference || {}),
          [nestedKey]: value,
        },
      }
    }

    if (fieldKey.startsWith('lineItems.')) {
      const [, indexValue, lineItemKey] = fieldKey.split('.')
      const itemIndex = Number.parseInt(indexValue, 10)
      const sourceItems = Array.isArray(rawQuotation.lineItems) && rawQuotation.lineItems.length > 0
        ? rawQuotation.lineItems
        : buildLineItems(rawQuotation)
      const nextLineItems = sourceItems.map((lineItem, index) => {
        if (index !== itemIndex) return lineItem

        const nextItem = { ...lineItem }
        if (lineItemKey === 'quantity') {
          nextItem.quantity = normalizeInlineCurrencyValue(value)
        } else if (lineItemKey === 'rate') {
          nextItem.rate = normalizeInlineCurrencyValue(value)
        } else {
          nextItem[lineItemKey] = value
        }
        nextItem.amount = toNumber(nextItem.quantity) * toNumber(nextItem.rate)
        return nextItem
      })

      return {
        lineItems: nextLineItems,
        amount: nextLineItems.reduce((sum, lineItem) => sum + toNumber(lineItem.amount), 0),
        totalAmount: nextLineItems.reduce((sum, lineItem) => sum + toNumber(lineItem.amount), 0),
      }
    }

    return { [fieldKey]: value }
  }

  const handleInlineQuotationEdit = async (fieldKey, value) => {
    if (!viewRow?.id || !fieldKey) return

    const rawQuotation = viewRow.raw || {}
    const patch = buildInlineQuotationPatch(rawQuotation, fieldKey, value)
    const optimisticRaw = {
      ...rawQuotation,
      ...patch,
    }

    setViewRow((currentRow) => (
      currentRow?.id === viewRow.id
        ? { ...currentRow, raw: optimisticRaw }
        : currentRow
    ))

    const result = await updateQuotation(viewRow.id, patch)
    if (!result.success) {
      addNotification('error', 'Quotation update failed', result.message || 'Unable to save quotation field.')
      setViewRow((currentRow) => (
        currentRow?.id === viewRow.id
          ? { ...currentRow, raw: rawQuotation }
          : currentRow
      ))
      return
    }

    addNotification('success', 'Quotation updated', 'Quotation field saved.')
  }

  const handleAction = (actionKey, row) => {
    if (actionKey === 'pdf') {
      openPdfPage(row)
      return
    }

    if (actionKey === 'preview') {
      setPreviewRow(row)
      return
    }

    if (actionKey === 'view') {
      openQuotationView(row)
      return
    }

    if (actionKey === 'approve') {
      setApproveRow(row)
      return
    }

    if (actionKey === 'reject') {
      setRejectRow(row)
      setRejectReason(row.raw.rejectionReason || '')
      setRejectError('')
      return
    }

    if (actionKey === 'clone') {
      navigate(generatorPath, { state: { quotationDraft: { ...row.raw, status: 'approved', rejectionReason: '' } } })
      return
    }

    if (actionKey === 'account') {
      setAccountRow(row)
    }
  }

  const handleExportSingleQuotation = (quotation) => {
    const dataRow = {
      'Quotation No': quotation.quotationNumber,
      'Title': quotation.title,
      'Account': quotation.accountName,
      'Status': quotation.status,
      'Date': quotation.date ? new Date(quotation.date).toLocaleDateString() : '-',
      'Value': quotation.totalAmount,
      'Currency': quotation.amountCurrency,
    }
    const columns = Object.keys(dataRow).map((key) => ({ key, label: key, width: 25 }))
    exportExcelWorkbook({
      title: 'Quotation Export',
      subtitle: `Quotation ${quotation.quotationNumber}`,
      columns,
      rows: [dataRow],
      sheetName: 'Quotation',
      filename: `Quotation-${quotation.quotationNumber}.xlsx`,
      creator: user?.name || 'System',
    })
    showToast('success', 'Quotation exported to Excel.')
  }

  const handleDeleteViewedQuotation = async () => {
    if (!viewRow?.id) return
    const confirmed = window.confirm('Are you sure you want to delete this Quotation?')
    if (!confirmed) return

    try {
      await quotationApi.frontendDeleteQuotation(viewRow.id)
      closeQuotationView()
      addNotification('success', 'Quotation deleted', 'Quotation was removed from the list.')
      await refreshData()
    } catch (error) {
      addNotification('error', 'Delete failed', error?.response?.data?.message || error?.message || 'Unable to delete quotation.')
    }
  }

  const handleViewModalAction = (actionKey) => {
    if (!viewRow) return

    if (actionKey === 'view') return

    const currentRow = viewRow
    closeQuotationView()
    handleAction(actionKey, currentRow)
  }

  const handleViewQuotationExport = (format) => {
    if (!viewRow) return
    const doc = buildQuotationDocumentData(viewRow.raw, viewRow.linkedAccount)
    const options = buildQuotationViewExportOptions(doc)
    if (!options) return

    const quotationLabel = String(doc.quotationNumber || 'draft').replace(/[^A-Za-z0-9_-]+/g, '_')
    const fileBase = `Quotation_${quotationLabel}_${new Date().toISOString().slice(0, 10)}`

    if (format === 'csv') {
      exportCsvWorkbook({ ...options, filename: `${fileBase}.csv` })
      addNotification('success', 'CSV exported', `Quotation ${doc.quotationNumber} exported to CSV.`)
      return
    }

    exportExcelWorkbook({ ...options, filename: `${fileBase}.xlsx` })
    addNotification('success', 'Excel exported', `Quotation ${doc.quotationNumber} exported to Excel.`)
  }

  const previewDocument = previewRow ? buildQuotationDocumentData(previewRow.raw, previewRow.linkedAccount) : null
  const pdfDocument = pdfRow ? buildQuotationDocumentData(pdfRow.raw, pdfRow.linkedAccount) : null
  const viewDocument = viewRow ? buildQuotationDocumentData(viewRow.raw, viewRow.linkedAccount) : null
  const previewActions = previewRow ? getAllowedQuotationActions(user, previewRow) : []
  const viewActions = viewRow ? getAllowedQuotationActions(user, viewRow) : []
  const accountDetails = accountRow?.linkedAccount || null
  const relatedQuotations = useMemo(
    () => buildRelatedQuotationRows(accountDetails),
    [accountDetails, rows]
  )

  if (!isAuthorized) return null

  if (pdfDocument) {
    return (
      <QuotationPdfViewer
        documentData={pdfDocument}
        title={`QUOTATION - ${pdfDocument.quotationNumber}`}
        subtitle={pdfDocument.companyName}
        onBack={closePdfPage}
        onPrint={handlePrintPdfPage}
        onDownload={handleDownloadPdfPage}
      />
    )
  }

  return (
    <div className="aqp-page">
      <div className="aqp-titlebar">
        <h1 className="aqp-title">Quotation Manager</h1>
      </div>

      <div className="aqp-tab-bar">
        <div className="aqp-tabs">
          <button
            type="button"
            className={`aqp-tab${activeTab === 'account' ? ' aqp-tab--active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            ACCOUNT
          </button>
          <button
            type="button"
            className={`aqp-tab${activeTab === 'deal' ? ' aqp-tab--active' : ''}`}
            onClick={() => setActiveTab('deal')}
          >
            DEAL
          </button>
        </div>

        <div className="aqp-tab-actions">
          <ExcelExportMenuButton
            label="Export"
            title="Export actions"
            className="aqp-export-menu"
            buttonClassName="aqp-btn aqp-btn--white"
            menuClassName="aqp-export-dropdown"
            items={[
              {
                key: 'export-csv',
                label: 'Export to CSV',
                badge: 'CSV',
                onClick: () => handleExportRows('csv'),
              },
              {
                key: 'export-excel',
                label: 'Export to Excel .xlsx',
                badge: 'XLSX',
                onClick: () => handleExportRows('excel'),
              },
            ]}
          />
          <button type="button" className="aqp-btn aqp-btn--gray" onClick={openUploadQuotationModal}>
            <FaUpload className="aqp-btn-icon" />
            Upload Quotation
          </button>
          <button type="button" className="aqp-btn aqp-btn--red aqp-btn--generate" onClick={() => navigate(generatorPath, { state: { openGenerator: true } })}>
            <FaPlus className="aqp-btn-icon" />
            Generate Quotation
          </button>
        </div>
      </div>

      <div className="aqp-content-wrapper">
        <div className="aqp-main-content">
          <div className="aqp-table-wrap">
        <table className="aqp-table">
          <thead>
            <tr className="aqp-thead-row">
              {selectedFieldDefinitions.map((field) => (
                <th key={field.key} className={`aqp-th aqp-field--${field.key}`}>
                  {field.label} <FaSort className="aqp-sort-icon" />
                </th>
              ))}
            </tr>
            <tr className="aqp-search-row">
              {selectedFieldDefinitions.map((field) => (
                <th key={field.key} className={`aqp-search-th aqp-field--${field.key}`}>
                  <input
                    className="aqp-search-input"
                    value={filters[field.key] || ''}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, [field.key]: event.target.value }))
                      setPage(1)
                    }}
                    placeholder={"Search " + field.label}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotationsLoading && paginatedRows.length === 0 ? (
              <tr className="aqp-row">
                <td className="aqp-td" colSpan={Math.max(1, selectedFieldDefinitions.length)}>Loading quotations...</td>
              </tr>
            ) : quotationsError && paginatedRows.length === 0 ? (
              <tr className="aqp-row">
                <td className="aqp-td" colSpan={Math.max(1, selectedFieldDefinitions.length)}>{quotationsError}</td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr className="aqp-row">
                <td className="aqp-td" colSpan={Math.max(1, selectedFieldDefinitions.length)}>No quotations found.</td>
              </tr>
            ) : paginatedRows.map((row) => (
              <tr
                key={row.id}
                className="aqp-row"
                onClick={() => openQuotationView(row)}
                title={`Click to view ${row.num}`}
              >
                {selectedFieldDefinitions.map((field) => {
                  if (field.key === 'num') {
                    return (
                      <td key={field.key} className={`aqp-td aqp-td--num aqp-field--${field.key}`}>
                        <button
                          type="button"
                          className={`aqp-num-badge aqp-num-badge--button ${getActionBadgeClassName(row.status)}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            openQuotationView(row)
                          }}
                        >
                          {row.num}
                        </button>
                      </td>
                    )
                  }

                  if (field.key === 'status') {
                    return (
                      <td key={field.key} className={`aqp-td aqp-field--${field.key}`}>
                        <StatusBadge status={row.status} />
                      </td>
                    )
                  }

                  const value = field.exportValue(row)
                  const className = field.key === 'company'
                    ? `aqp-td aqp-td--link aqp-field--${field.key}`
                    : field.key === 'amount'
                      ? `aqp-td aqp-td--amount aqp-field--${field.key}`
                      : `aqp-td aqp-field--${field.key}`

                  return (
                    <td key={field.key} className={className}>
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="aqp-pagination">
        <span className="aqp-page-icon">{filteredRows.length}</span>
        <span className="aqp-total-label">Total records: {filteredRows.length}</span>
        <div className="aqp-page-btns">
          <button type="button" className="aqp-page-btn" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
            <FaChevronLeft />
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`aqp-page-btn${page === pageNumber ? ' aqp-page-btn--active' : ''}`}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" className="aqp-page-btn" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
            <FaChevronRight />
          </button>
        </div>
      </div>
        </div>
      </div>

      {isFieldPanelOpen ? (
        <div className="aqp-field-panel-overlay" onClick={() => setIsFieldPanelOpen(false)}>
          <div className="aqp-field-panel" onClick={(event) => event.stopPropagation()}>
            <div className="aqp-field-panel-header">
              <h2>Select Quotation Report Fields</h2>
              <div className="aqp-field-panel-actions">
                <button type="button" className="aqp-field-panel-btn aqp-field-panel-btn--ghost" onClick={() => setIsFieldPanelOpen(false)}>
                  Close
                </button>
                <button type="button" className="aqp-field-panel-btn aqp-field-panel-btn--blue" onClick={() => handleApplyFieldPanel(false)}>
                  Apply
                </button>
                <button type="button" className="aqp-field-panel-btn aqp-field-panel-btn--green" onClick={() => handleApplyFieldPanel(true)}>
                  Save &amp; Apply
                </button>
              </div>
            </div>

            <div className="aqp-field-panel-grid">
              <section className="aqp-field-box">
                <div className="aqp-field-box-header">Quotation Fields</div>
                <div className="aqp-field-box-list">
                  {availableFieldDefinitions.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      className="aqp-field-option"
                      onClick={() => handleAddSelectedField(field.key)}
                    >
                      <span>{field.label}</span>
                      <strong>+</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="aqp-field-box">
                <div className="aqp-field-box-header">Selected Fields</div>
                <div className="aqp-field-box-list">
                  {fieldPanelDraft.selectedFields.map((fieldKey) => {
                    const field = ADMIN_QUOTATION_FIELD_DEFINITIONS.find((entry) => entry.key === fieldKey)
                    if (!field) return null

                    return (
                      <div
                        key={field.key}
                        className="aqp-field-selected"
                        draggable
                        onDragStart={() => setDraggedFieldKey(field.key)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleSelectedFieldDrop(field.key)}
                      >
                        <span>{field.label}</span>
                        <button type="button" className="aqp-field-remove" onClick={() => handleRemoveSelectedField(field.key)}>
                          <FaTimes />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {isUploadQuotationOpen ? (
        <ModalShell
          title="Upload Account Quotation"
          onClose={closeUploadQuotationModal}
          size="aqp-modal--upload"
          footer={(
            <>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={closeUploadQuotationModal} disabled={uploadQuotationSaving}>
                Close
              </button>
              <button type="submit" form="aqp-upload-quotation-form" className="aqp-btn aqp-btn--blue" disabled={uploadQuotationSaving}>
                {uploadQuotationSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        >
          <form id="aqp-upload-quotation-form" className="aqp-upload-form" onSubmit={handleUploadQuotationSave}>
            <div className="aqp-upload-note">
              Please select the account from the Account List popup before saving the uploaded quotation.
            </div>

            <div className="aqp-upload-grid">
              <label className="aqp-form-field aqp-upload-grid__full">
                <span className="aqp-form-label aqp-form-label--required">Select Account</span>
                <div className="aqp-upload-account-picker">
                  <input
                    className={`aqp-upload-input${uploadQuotationErrors.selectedAccountId ? ' aqp-upload-input--error' : ''}`}
                    value={uploadQuotationForm.selectedAccountLabel}
                    placeholder="Click the search icon to select an account"
                    readOnly
                  />
                  <button
                    type="button"
                    className="aqp-upload-account-button"
                    onClick={handleOpenAccountList}
                    aria-label="Search accounts"
                  >
                    <FaSearch />
                  </button>
                </div>
                {uploadQuotationErrors.selectedAccountId ? <div className="aqp-form-error">{uploadQuotationErrors.selectedAccountId}</div> : null}
              </label>

              {selectedUploadAccount ? (
                <div className="aqp-upload-account-card aqp-upload-grid__full">
                  <div className="aqp-upload-account-note">
                    Please double click on another account in the list if you want to change this selection.
                  </div>
                  <div className="aqp-upload-account-grid">
                    <div className="aqp-upload-account-item">
                      <span className="aqp-upload-account-item-label">Account No.</span>
                      <span className="aqp-upload-account-item-value">{selectedUploadAccount.accountNumber || '-'}</span>
                    </div>
                    <div className="aqp-upload-account-item">
                      <span className="aqp-upload-account-item-label">Account Name</span>
                      <span className="aqp-upload-account-item-value">{selectedUploadAccount.name || '-'}</span>
                    </div>
                    <div className="aqp-upload-account-item">
                      <span className="aqp-upload-account-item-label">Email</span>
                      <span className="aqp-upload-account-item-value">{uploadQuotationForm.email || '-'}</span>
                    </div>
                    <div className="aqp-upload-account-item">
                      <span className="aqp-upload-account-item-label">Phone</span>
                      <span className="aqp-upload-account-item-value">{uploadQuotationForm.phone || '-'}</span>
                    </div>
                    <div className="aqp-upload-account-item">
                      <span className="aqp-upload-account-item-label">Account Owner</span>
                      <span className="aqp-upload-account-item-value">{uploadQuotationForm.accountOwner || '-'}</span>
                    </div>
                    <div className="aqp-upload-account-item aqp-upload-account-item--wide">
                      <span className="aqp-upload-account-item-label">Address</span>
                      <span className="aqp-upload-account-item-value">{uploadQuotationForm.address || '-'}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <label className="aqp-form-field">
                <span className="aqp-form-label aqp-form-label--required">Quote Number</span>
                <input
                  className={`aqp-upload-input${uploadQuotationErrors.quoteNumber ? ' aqp-upload-input--error' : ''}`}
                  value={uploadQuotationForm.quoteNumber}
                  onChange={(event) => handleUploadQuotationFieldChange('quoteNumber', event.target.value)}
                />
                {uploadQuotationErrors.quoteNumber ? <div className="aqp-form-error">{uploadQuotationErrors.quoteNumber}</div> : null}
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label aqp-form-label--required">Quotation Date</span>
                <input
                  type="date"
                  className={`aqp-upload-input${uploadQuotationErrors.quotationDate ? ' aqp-upload-input--error' : ''}`}
                  value={uploadQuotationForm.quotationDate}
                  onChange={(event) => handleUploadQuotationFieldChange('quotationDate', event.target.value)}
                />
                {uploadQuotationErrors.quotationDate ? <div className="aqp-form-error">{uploadQuotationErrors.quotationDate}</div> : null}
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label aqp-form-label--required">Total Amount</span>
                <div className="aqp-upload-field-inline">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`aqp-upload-input${uploadQuotationErrors.totalAmount ? ' aqp-upload-input--error' : ''}`}
                    value={uploadQuotationForm.totalAmount}
                    onChange={(event) => handleUploadQuotationFieldChange('totalAmount', event.target.value)}
                  />
                  <select
                    className="aqp-upload-select aqp-upload-select--currency"
                    value={uploadQuotationForm.amountCurrency}
                    onChange={(event) => handleUploadQuotationFieldChange('amountCurrency', event.target.value)}
                  >
                    {QUOTATION_CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.value} value={currency.value}>{currency.label}</option>
                    ))}
                  </select>
                </div>
                {uploadQuotationErrors.totalAmount ? <div className="aqp-form-error">{uploadQuotationErrors.totalAmount}</div> : null}
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label">Total Product Tax</span>
                <div className="aqp-upload-field-inline">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="aqp-upload-input"
                    value={uploadQuotationForm.totalProductTax}
                    onChange={(event) => handleUploadQuotationFieldChange('totalProductTax', event.target.value)}
                  />
                  <select
                    className="aqp-upload-select aqp-upload-select--currency"
                    value={uploadQuotationForm.taxCurrency}
                    onChange={(event) => handleUploadQuotationFieldChange('taxCurrency', event.target.value)}
                  >
                    {QUOTATION_CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.value} value={currency.value}>{currency.label}</option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label aqp-form-label--required">Quotation Status</span>
                <select
                  className={`aqp-upload-select${uploadQuotationErrors.quotationStatus ? ' aqp-upload-select--error' : ''}`}
                  value={uploadQuotationForm.quotationStatus}
                  onChange={(event) => handleUploadQuotationFieldChange('quotationStatus', event.target.value)}
                >
                  {UPLOAD_QUOTATION_STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption.value || 'select'} value={statusOption.value}>{statusOption.label}</option>
                  ))}
                </select>
                {uploadQuotationErrors.quotationStatus ? <div className="aqp-form-error">{uploadQuotationErrors.quotationStatus}</div> : null}
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label">Valid Until Date</span>
                <input
                  type="date"
                  className="aqp-upload-input"
                  value={uploadQuotationForm.validUntilDate}
                  onChange={(event) => handleUploadQuotationFieldChange('validUntilDate', event.target.value)}
                />
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label">Contact Person</span>
                <input
                  className="aqp-upload-input"
                  value={uploadQuotationForm.contactPerson}
                  onChange={(event) => handleUploadQuotationFieldChange('contactPerson', event.target.value)}
                />
              </label>

              <label className="aqp-form-field aqp-upload-grid__full">
                <span className="aqp-form-label">Address</span>
                <textarea
                  className="aqp-textarea"
                  rows={3}
                  value={uploadQuotationForm.address}
                  onChange={(event) => handleUploadQuotationFieldChange('address', event.target.value)}
                />
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label">Email</span>
                <input
                  className="aqp-upload-input"
                  value={uploadQuotationForm.email}
                  onChange={(event) => handleUploadQuotationFieldChange('email', event.target.value)}
                />
              </label>

              <label className="aqp-form-field">
                <span className="aqp-form-label">Phone</span>
                <input
                  className="aqp-upload-input"
                  value={uploadQuotationForm.phone}
                  onChange={(event) => handleUploadQuotationFieldChange('phone', event.target.value)}
                />
              </label>

              <label className="aqp-form-field aqp-upload-grid__full">
                <span className="aqp-form-label aqp-form-label--required">Quote File</span>
                <input
                  type="file"
                  accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className={`aqp-upload-file-input${uploadQuotationErrors.quoteFile ? ' aqp-upload-file-input--error' : ''}`}
                  onChange={handleUploadQuotationFileChange}
                />
                <div className="aqp-upload-file-note">
                  Allowed file types: PDF, XLS, XLSX. Maximum size: 5 MB.
                </div>
                {uploadQuotationForm.quoteFileName ? (
                  <div className="aqp-upload-file-name">{uploadQuotationForm.quoteFileName}</div>
                ) : null}
                {uploadQuotationErrors.quoteFile ? <div className="aqp-form-error">{uploadQuotationErrors.quoteFile}</div> : null}
              </label>
            </div>

            {uploadQuotationMessage ? <div className="aqp-upload-message">{uploadQuotationMessage}</div> : null}
          </form>
        </ModalShell>
      ) : null}

      {isUploadQuotationOpen && isAccountListOpen ? (
        <ModalShell
          title="Account List"
          onClose={() => setIsAccountListOpen(false)}
          size="aqp-modal--xl"
        >
          <div className="aqp-account-list">
            <div className="aqp-account-list-note">
              Please double click on the account to select a account.
            </div>

            <div className="aqp-account-list-table-wrap">
              <table className="aqp-account-list-table">
                <thead>
                  <tr className="aqp-account-list-header-row">
                    <th>Account No.</th>
                    <th>Account Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Account Owner</th>
                  </tr>
                  <tr className="aqp-account-list-search-row">
                    <th>
                      <input
                        className="aqp-account-list-search-input"
                        value={accountFilters.accountNumber}
                        onChange={(event) => handleAccountFilterChange('accountNumber', event.target.value)}
                        placeholder="Search here ..."
                      />
                    </th>
                    <th>
                      <input
                        className="aqp-account-list-search-input"
                        value={accountFilters.name}
                        onChange={(event) => handleAccountFilterChange('name', event.target.value)}
                        placeholder="Search here ..."
                      />
                    </th>
                    <th>
                      <input
                        className="aqp-account-list-search-input"
                        value={accountFilters.email}
                        onChange={(event) => handleAccountFilterChange('email', event.target.value)}
                        placeholder="Search here ..."
                      />
                    </th>
                    <th>
                      <input
                        className="aqp-account-list-search-input"
                        value={accountFilters.phone}
                        onChange={(event) => handleAccountFilterChange('phone', event.target.value)}
                        placeholder="Search here ..."
                      />
                    </th>
                    <th>
                      <input
                        className="aqp-account-list-search-input"
                        value={accountFilters.accountOwner}
                        onChange={(event) => handleAccountFilterChange('accountOwner', event.target.value)}
                        placeholder="Search here ..."
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccounts.length > 0 ? (
                    paginatedAccounts.map((account) => (
                      <tr
                        key={account.id}
                        className={`aqp-account-list-row${uploadQuotationForm.selectedAccountId === account.id ? ' aqp-account-list-row--selected' : ''}`}
                        onDoubleClick={() => handleUploadAccountSelect(account)}
                      >
                        <td>{account.accountNumber || '-'}</td>
                        <td>{account.name || '-'}</td>
                        <td>{account.email || '-'}</td>
                        <td>{account.phone || '-'}</td>
                        <td>{account.accountOwnerDisplay || account.accountOwner || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="aqp-account-list-empty">
                        No accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="aqp-account-list-pagination">
              <span className="aqp-account-list-total">Total records: {filteredAccounts.length}</span>
              <div className="aqp-account-list-pagination-actions">
                <button
                  type="button"
                  className="aqp-account-list-page-button"
                  onClick={() => setAccountListPage((currentValue) => Math.max(1, currentValue - 1))}
                  disabled={accountListPage === 1}
                >
                  prev
                </button>
                {visibleAccountPages.map((visiblePage) => (
                  <button
                    key={visiblePage}
                    type="button"
                    className={`aqp-account-list-page-button${visiblePage === accountListPage ? ' aqp-account-list-page-button--active' : ''}`}
                    onClick={() => setAccountListPage(visiblePage)}
                  >
                    {visiblePage}
                  </button>
                ))}
                <button
                  type="button"
                  className="aqp-account-list-page-button"
                  onClick={() => setAccountListPage((currentValue) => Math.min(totalAccountPages, currentValue + 1))}
                  disabled={accountListPage === totalAccountPages}
                >
                  next
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {previewDocument ? (
        <ModalShell
          title={`Quotation Preview - ${previewDocument.quotationNumber}`}
          onClose={() => setPreviewRow(null)}
          size="aqp-modal--xl"
          footer={(
            <>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => setPreviewRow(null)}>
                Close
              </button>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => triggerBrowserPdfSave(previewDocument)}>
                <FaPrint className="aqp-btn-icon" />
                Print
              </button>
            </>
          )}
        >
          <QuotationDocument documentData={previewDocument} />
        </ModalShell>
      ) : null}

      {viewDocument ? (
        <ModalShell
          title={`View Quotation - ${viewDocument.quotationNumber}`}
          onClose={closeQuotationView}
          onDelete={() => handleDeleteQuotation(viewDocument)}
          size="aqp-modal--xl"
        >
          <div className="aqp-view-top-actions">
            <div className="aqp-modal-footer-group">
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={handleDeleteViewedQuotation} aria-label="Delete quotation">
                <FaTrash className="aqp-btn-icon" />
                Delete
              </button>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={closeQuotationView}>
                Close
              </button>
              <button type="button" className="aqp-btn aqp-btn--blue" onClick={() => triggerBrowserPdfSave(viewDocument)}>
                <FaPrint className="aqp-btn-icon" />
                Print
              </button>
              <ExcelExportMenuButton
                label="Excel"
                title="Export quotation to Excel"
                className="quotation-view-export"
                buttonClassName="aqp-btn aqp-btn--gray"
                menuClassName="quotation-view-export-menu"
                items={[
                  {
                    key: 'quotation-single-excel',
                    label: 'Export to Excel .xlsx',
                    badge: 'XLSX',
                    onClick: () => handleExportSingleQuotation(viewDocument),
                  },
                ]}
              />
            </div>
          </div>
          <div className="aqp-view-quotation-document">
            <QuotationDocument
              documentData={viewDocument}
              editable
              onEditField={handleInlineQuotationEdit}
            />
          </div>
        </ModalShell>
      ) : null}

      {accountRow ? (
        <ModalShell
          title={`View Account - ${accountRow.company}`}
          onClose={() => setAccountRow(null)}
          size="aqp-modal--lg"
          footer={(
            <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => setAccountRow(null)}>
              Close
            </button>
          )}
        >
          <div className="aqp-account">
            <div className="aqp-account__grid">
              <div><strong>Account No.:</strong> {sectionValue(accountDetails?.accountNumber || accountRow.raw.clientAccountNumber)}</div>
              <div><strong>Account Name:</strong> {sectionValue(accountDetails?.name || accountRow.company)}</div>
              <div><strong>Email:</strong> {sectionValue(accountDetails?.email || accountRow.raw.email)}</div>
              <div><strong>Phone:</strong> {sectionValue(accountDetails?.phone || accountRow.raw.telephone)}</div>
              <div><strong>Account Owner:</strong> {sectionValue(accountDetails?.accountOwnerDisplay || accountDetails?.accountOwner || accountRow.raw.selectedAccountOwner)}</div>
              <div><strong>GSTIN:</strong> {sectionValue(accountDetails?.gstin || accountRow.raw.gstin)}</div>
              <div><strong>State Code:</strong> {sectionValue(accountDetails?.stateCode || accountRow.raw.stateCode)}</div>
              <div><strong>Contact Person:</strong> {sectionValue(accountDetails?.contactPerson || accountRow.raw.contactPerson)}</div>
            </div>
            <div className="aqp-account__section">
              <h3>Address</h3>
              <p>{sectionValue(accountDetails?.address || accountRow.raw.clientAddressDetails)}</p>
            </div>
            <div className="aqp-account__section">
              <h3>Related Quotations</h3>
              {relatedQuotations.length === 0 ? (
                <p>No related quotations found.</p>
              ) : (
                <table className="aqp-account__table">
                  <thead>
                    <tr>
                      <th>Quotation No.</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedQuotations.map((row) => (
                      <tr key={row.id} onClick={() => openQuotationView(row)} title={`Click to view ${row.num}`}>
                        <td className="aqp-account__table-cell--num">
                          <button
                            type="button"
                            className={`aqp-num-badge aqp-num-badge--button ${getActionBadgeClassName(row.status)}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              openQuotationView(row)
                            }}
                          >
                            {row.num}
                          </button>
                        </td>
                        <td>{row.date}</td>
                        <td>{row.statusLabel}</td>
                        <td>{row.amountLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {approveRow ? (
        <ModalShell
          title="Approve Quote"
          onClose={() => setApproveRow(null)}
          footer={(
            <>
              <button type="button" className="aqp-btn aqp-btn--gray" onClick={() => setApproveRow(null)} disabled={actionLoadingId === approveRow.id}>
                Cancel
              </button>
              <button type="button" className="aqp-btn aqp-btn--blue" onClick={handleApprove} disabled={actionLoadingId === approveRow.id}>
                {actionLoadingId === approveRow.id ? 'Approving...' : 'Approve'}
              </button>
            </>
          )}
        >
          <p>Are you sure you want to approve this quote?</p>
        </ModalShell>
      ) : null}

      {rejectRow ? (
        <ModalShell
          title="Reject Quote"
          onClose={() => {
            setRejectRow(null)
            setRejectError('')
            setRejectReason('')
          }}
          footer={(
            <>
              <button
                type="button"
                className="aqp-btn aqp-btn--gray"
                onClick={() => {
                  setRejectRow(null)
                  setRejectError('')
                  setRejectReason('')
                }}
                disabled={actionLoadingId === rejectRow.id}
              >
                Cancel
              </button>
              <button type="button" className="aqp-btn aqp-btn--blue" onClick={handleRejectSubmit} disabled={actionLoadingId === rejectRow.id}>
                {actionLoadingId === rejectRow.id ? 'Rejecting...' : 'Reject Quote'}
              </button>
            </>
          )}
        >
          <label className="aqp-form-field">
            <span className="aqp-form-label">Rejection Reason</span>
            <textarea
              className={`aqp-textarea${rejectError ? ' aqp-textarea--error' : ''}`}
              rows={5}
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value)
                if (rejectError) setRejectError('')
              }}
              placeholder="Enter rejection reason"
            />
          </label>
          {rejectError ? <div className="aqp-form-error">{rejectError}</div> : null}
        </ModalShell>
      ) : null}
    </div>
  )
}

export default AdminQuotationsPage
