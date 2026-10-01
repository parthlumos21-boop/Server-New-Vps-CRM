import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { ExcelExportActionButton } from '../../../components/common/ExcelExportButton'
import { useData } from '../../../context/DataContext'
import { exportCsvWorkbook, exportExcelWorkbook } from '../../../utils/excelExport'
import '../accounts/MyGroupAccounts.css'

const fields = [
  ['Project Name', 'projectName'],
  ['Project Code', 'projectCode'],
  ['Account', 'accountName'],
  ['Customer', 'customerName'],
  ['Consultant', 'consultantName'],
  ['Architect', 'architectName'],
  ['PMC', 'pmcName'],
  ['Location', 'projectLocation'],
  ['Status', 'projectStatus'],
  ['Description', 'projectDescription'],
]

const PROJECT_EXPORT_COLUMNS = [
  { key: 'field', label: 'Field', align: 'left',  width: 28 },
  { key: 'value', label: 'Value', align: 'left',  width: 56, wrap: true },
]

const ProjectDetailsPage = () => {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { projects } = useData()

  const project = useMemo(() => (
    (projects || []).find((entry) => (
      String(entry.id) === String(projectId)
      || String(entry.projectId) === String(projectId)
    ))
  ), [projectId, projects])

  const buildProjectExportOptions = () => {
    if (!project) return null
    const rows = fields.map(([label, key]) => ({
      field: label,
      value: project[key] || '-',
    }))
    const safeName = String(project.projectName || project.projectCode || 'project')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
    const timestamp = new Date().toISOString().slice(0, 10)

    return {
      title: 'Project Details',
      subtitle: project.projectName || 'Project Information',
      sheetName: 'Project',
      metadata: [
        { label: 'Project Name',  value: project.projectName || '-' },
        { label: 'Project Code',  value: project.projectCode || '-' },
        { label: 'Account',       value: project.accountName || '-' },
        { label: 'Status',        value: project.projectStatus || '-' },
      ],
      columns: PROJECT_EXPORT_COLUMNS,
      rows,
      fileBase: `Project_${safeName}_${timestamp}`,
    }
  }

  const handleExport = (format) => {
    const options = buildProjectExportOptions()
    if (!options) return
    const { fileBase, ...rest } = options
    if (format === 'csv') {
      exportCsvWorkbook({ ...rest, filename: `${fileBase}.csv` })
      return
    }
    exportExcelWorkbook({ ...rest, filename: `${fileBase}.xlsx` })
  }

  return (
    <div className="admin-accounts-placeholder-page">
      <section className="admin-accounts-placeholder-card">
        <div className="admin-accounts-placeholder-eyebrow">Project Details</div>
        <h1>{project?.projectName || 'Project Not Found'}</h1>
        <p>{project ? 'Project master information linked with account and customer records.' : 'The selected project is not available in the current project list.'}</p>

        {project ? (
          <div className="admin-accounts-placeholder-context">
            <h2>Project Information</h2>
            <div className="admin-accounts-placeholder-context-grid">
              {fields.map(([label, key]) => (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{project[key] || '-'}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="admin-accounts-placeholder-actions">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          {project ? (
            <ExcelExportActionButton
              label="Export"
              title="Download project details as Excel"
              onClick={() => handleExport('excel')}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default ProjectDetailsPage
