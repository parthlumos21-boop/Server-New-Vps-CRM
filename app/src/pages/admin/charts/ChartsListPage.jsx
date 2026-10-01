import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaChartPie, FaCheckCircle, FaChevronDown,
  FaCopy, FaEye, FaMobileAlt, FaPencilAlt, FaTrash,
} from 'react-icons/fa'
import { ADMIN_CHART_CATEGORIES } from '../../../features/adminCharts/chartDefinitions'
import { loadAllCharts } from '../../../features/adminCharts/chartStorage'
import { useData } from '../../../context/DataContext'
import ChartPreviewModal from './ChartPreviewModal'
import './ChartsListPage.css'

const CATEGORY_LINK_BY_FILTER = {
  Accounts: '/admin/accounts',
  Customers: '/admin/customers/search',
  SR: '/admin/support-requests/list',
  Deals: '/admin/deals/view',
}

const ChartRow = ({
  chart,
  isExpanded,
  linkedLabel,
  onToggleExpand,
  onEdit,
  onView,
  onToggleActive,
  onToggleMobile,
  onCopy,
  onDelete,
}) => (
  <div className={`cl-row ${isExpanded ? 'cl-row-expanded' : ''}`}>
    <div className="cl-row-main">
      <div className="cl-row-left">
        <button
          type="button"
          className={`cl-row-toggle ${isExpanded ? 'cl-row-toggle-open' : ''}`}
          onClick={onToggleExpand}
          aria-label={isExpanded ? `Collapse ${chart.title}` : `Expand ${chart.title}`}
        >
          <FaChevronDown />
        </button>
        <button
          type="button"
          className="cl-row-title cl-row-title-link"
          onClick={onView}
          title={linkedLabel ? `Open in ${linkedLabel}` : 'View chart'}
        >
          {chart.title}
        </button>
      </div>

      <div className="cl-row-right">
        <span className="cl-row-type">{chart.type}</span>
        <span className="cl-sep">|</span>
        <button type="button" className="cl-action cl-action--edit" title="Edit" onClick={onEdit}>
          <FaPencilAlt />
        </button>
        <span className="cl-sep">|</span>
        <button type="button" className="cl-action cl-action--view" title="View" onClick={onView}>
          <FaEye />
        </button>
        <span className="cl-sep">|</span>
        <button
          type="button"
          className={`cl-action ${chart.active ? 'cl-action--check-active' : 'cl-action--check'}`}
          title={chart.active ? 'Deactivate' : 'Activate'}
          onClick={onToggleActive}
        >
          <FaCheckCircle />
        </button>
        <span className="cl-sep">|</span>
        <button
          type="button"
          className={`cl-action ${chart.mobileEnabled ? 'cl-action--mobile' : 'cl-action--mobile-off'}`}
          title={chart.mobileEnabled ? 'Hide from mobile' : 'Show on mobile'}
          onClick={onToggleMobile}
        >
          <FaMobileAlt />
        </button>
        <span className="cl-sep">|</span>
        <button type="button" className="cl-action cl-action--copy" title="Duplicate" onClick={onCopy}>
          <FaCopy />
        </button>
        <span className="cl-sep">|</span>
        <button type="button" className="cl-action cl-action--delete" title="Delete" onClick={onDelete}>
          <FaTrash />
        </button>
      </div>
    </div>

    {isExpanded ? (
      <div className="cl-row-details">
        <dl className="cl-row-detail-grid">
          <dt>Type</dt><dd>{chart.type}</dd>
          <dt>Active</dt><dd>{chart.active ? 'Yes' : 'No'}</dd>
          <dt>Visible on mobile</dt><dd>{chart.mobileEnabled ? 'Yes' : 'No'}</dd>
        </dl>
      </div>
    ) : null}
  </div>
)

const ChartsListPage = ({ basePath = '/admin/charts' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { addNotification } = useData()
  const initialFilter = location.state?.newChartCategory || 'Accounts'
  const [activeFilter, setActiveFilter] = useState(initialFilter)
  const [chartData, setChartData] = useState(() => loadAllCharts())
  const [expandedIds, setExpandedIds] = useState({})
  const [statusMessage, setStatusMessage] = useState(null)
  const [previewChart, setPreviewChart] = useState(null)

  useEffect(() => {
    if (location.state?.newChartCategory) {
      setChartData(loadAllCharts())
    }
  }, [location.state])

  const rows = useMemo(() => chartData[activeFilter] || [], [activeFilter, chartData])

  const flashStatus = (type, text) => {
    setStatusMessage({ type, text })
    window.setTimeout(() => setStatusMessage(null), 2400)
  }

  const updateChart = (chartId, updater) => {
    setChartData((current) => ({
      ...current,
      [activeFilter]: (current[activeFilter] || []).map((chart) => (
        chart.id === chartId ? { ...chart, ...updater(chart) } : chart
      )),
    }))
  }

  const handleToggleExpand = (chartId) => {
    setExpandedIds((current) => ({ ...current, [chartId]: !current[chartId] }))
  }

  const handleEdit = (chart) => {
    navigate(`${basePath}/new`, { state: { editChartId: chart.id, editChartTitle: chart.title } })
  }

  const handleView = (chart) => {
    setPreviewChart(chart)
  }

  const handleToggleActive = (chart) => {
    updateChart(chart.id, (current) => ({ active: !current.active }))
    const nextState = !chart.active ? 'active' : 'inactive'
    flashStatus('success', `"${chart.title}" is now ${nextState}`)
    addNotification('success', 'Chart Updated', `"${chart.title}" is now ${nextState}.`)
  }

  const handleToggleMobile = (chart) => {
    updateChart(chart.id, (current) => ({ mobileEnabled: !current.mobileEnabled }))
    const nextState = !chart.mobileEnabled ? 'enabled' : 'disabled'
    flashStatus('success', `"${chart.title}" mobile visibility ${nextState}`)
    addNotification('success', 'Mobile Visibility', `"${chart.title}" mobile visibility ${nextState}.`)
  }

  const handleCopy = (chart) => {
    setChartData((current) => {
      const list = current[activeFilter] || []
      const originalIndex = list.findIndex((entry) => entry.id === chart.id)
      const duplicate = {
        ...chart,
        id: `${chart.id}-copy-${Date.now()}`,
        title: `${chart.title} (Copy)`,
      }
      const next = [...list]
      next.splice(originalIndex + 1, 0, duplicate)
      return { ...current, [activeFilter]: next }
    })
    flashStatus('success', `Duplicated "${chart.title}"`)
    addNotification('success', 'Chart Duplicated', `"${chart.title}" was duplicated.`)
  }

  const handleDelete = (chart) => {
    const confirmed = window.confirm(`Delete chart "${chart.title}"?`)
    if (!confirmed) return
    setChartData((current) => ({
      ...current,
      [activeFilter]: (current[activeFilter] || []).filter((entry) => entry.id !== chart.id),
    }))
    setExpandedIds((current) => {
      const next = { ...current }
      delete next[chart.id]
      return next
    })
    flashStatus('success', `Deleted "${chart.title}"`)
    addNotification('success', 'Chart Deleted', `"${chart.title}" was deleted.`)
  }

  return (
    <div className="cl-page">
      <div className="cl-topbar">
        <h1 className="cl-topbar-title">Charts</h1>
        <div className="cl-topbar-actions">
          <button
            type="button"
            className="cl-btn"
            onClick={() => navigate(`${basePath}/new`)}
          >
            <FaChartPie />
            <span>Add New Chart</span>
          </button>
        </div>
      </div>

      {statusMessage ? (
        <div className={`cl-status cl-status-${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      ) : null}

      <div className="cl-body">
        <aside className="cl-filter-panel">
          {ADMIN_CHART_CATEGORIES.map((filterLabel) => (
            <button
              key={filterLabel}
              type="button"
              className={`cl-filter-item${activeFilter === filterLabel ? ' cl-filter-item--active' : ''}`}
              onClick={() => setActiveFilter(filterLabel)}
            >
              {filterLabel}
            </button>
          ))}
        </aside>

        <main className="cl-main">
          <div className="cl-content-panel">
            {rows.length > 0 ? (
              rows.map((chart) => (
                <ChartRow
                  key={chart.id}
                  chart={chart}
                  isExpanded={Boolean(expandedIds[chart.id])}
                  linkedLabel={CATEGORY_LINK_BY_FILTER[activeFilter] ? activeFilter : ''}
                  onToggleExpand={() => handleToggleExpand(chart.id)}
                  onEdit={() => handleEdit(chart)}
                  onView={() => handleView(chart)}
                  onToggleActive={() => handleToggleActive(chart)}
                  onToggleMobile={() => handleToggleMobile(chart)}
                  onCopy={() => handleCopy(chart)}
                  onDelete={() => handleDelete(chart)}
                />
              ))
            ) : (
              <p className="cl-empty">No charts available for {activeFilter}.</p>
            )}
          </div>
        </main>
      </div>
      <ChartPreviewModal
        isOpen={!!previewChart}
        onClose={() => setPreviewChart(null)}
        chart={previewChart}
        category={activeFilter}
      />
    </div>
  )
}

export default ChartsListPage
