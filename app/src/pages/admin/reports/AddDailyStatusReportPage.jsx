import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { DAILY_STATUS_REPORT_CONTEXT_OPTIONS } from '../../../features/adminReports/dailyStatusReportTemplateConfig'
import { saveAdminReportTemplate } from '../../../features/adminReports/reportTemplateStorage'
import ReportOutputPreview from './ReportOutputPreview'
import './AddDailyStatusReportPage.css'

const DAILY_STATUS_OUTPUT_FIELDS = [
  'Record Number',
  'Record Name',
  'Remark Date/Time',
  'Remark Type',
  'Remark Added By',
  'Remarks',
]

const AddDailyStatusReportPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const reportListPath = location.pathname.startsWith('/admin') ? '/admin/reports/custom' : '/reports/custom'
  const [reportContext, setReportContext] = useState('')
  const [pageError, setPageError] = useState('')

  const selectedContext = useMemo(() => (
    DAILY_STATUS_REPORT_CONTEXT_OPTIONS.find((option) => option.value === reportContext) || null
  ), [reportContext])

  const handleSubmit = (event) => {
    event.preventDefault()
    setPageError('')

    if (!selectedContext) {
      setPageError('Select the report context.')
      return
    }

    saveAdminReportTemplate({
      entityType: 'Daily Status',
      typeLabel: 'Daily Status',
      categoryKey: 'daily_status',
      reportContext: selectedContext.value,
      reportName: selectedContext.reportName,
      description: selectedContext.description,
      visibility: 'Visible to Me Only',
      runtimePeriodEnabled: false,
      groupBy: '',
      orderBy: '',
      aggregate: '',
      filters: [],
      selectedFields: [],
      createdBy: user?.name || 'System Administrator',
      createdOn: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    navigate(reportListPath)
  }

  return (
    <div className="daily-status-report-builder-page">
      <div className="daily-status-report-builder-topbar">
        <h1>Add Daily Status Report</h1>
        <div className="daily-status-report-builder-topbar-actions">
          <button
            type="button"
            className="daily-status-report-builder-btn daily-status-report-builder-btn-cancel"
            onClick={() => navigate(reportListPath)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="daily-status-report-builder-form"
            className="daily-status-report-builder-btn daily-status-report-builder-btn-save"
          >
            Add
          </button>
        </div>
      </div>

      <form
        id="daily-status-report-builder-form"
        className="daily-status-report-builder-form"
        onSubmit={handleSubmit}
      >
        <section className="daily-status-report-builder-panel">
          <div className="daily-status-report-builder-row-inline">
            <label htmlFor="daily-status-report-context">Report Context</label>
            <select
              id="daily-status-report-context"
              value={reportContext}
              onChange={(event) => setReportContext(event.target.value)}
            >
              <option value="">Select</option>
              {DAILY_STATUS_REPORT_CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </section>

        <ReportOutputPreview
          reportName={selectedContext?.reportName || 'Daily Status Report'}
          selectedFields={DAILY_STATUS_OUTPUT_FIELDS}
        />

        {pageError && (
          <div className="daily-status-report-builder-error">{pageError}</div>
        )}
      </form>
    </div>
  )
}

export default AddDailyStatusReportPage
