import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaChartPie, FaCheckCircle, FaChevronDown,
  FaCopy, FaEye, FaMobileAlt, FaPencilAlt, FaTrash,
} from 'react-icons/fa'
import { ADMIN_CHART_CATEGORIES } from '../../../features/adminCharts/chartDefinitions'
import { loadAllCharts, fetchAllChartsFromDb } from '../../../features/adminCharts/chartStorage'
import { useData } from '../../../context/DataContext'
import ChartPreviewModal from './ChartPreviewModal'
import './ChartsListPage.css'

const getCategoryLink = (category, basePath) => {
  const isUser = !basePath.startsWith('/admin')
  if (isUser) {
    switch (category) {
      case 'Accounts': return '/accounts/search'
      case 'Customers': return '/customers/search'
      case 'SR': return '/support-requests/list'
      case 'Deals': return '/deals/view'
      case 'Quotations': return '/quotations/list'
      default: return '/charts'
    }
  }
  switch (category) {
    case 'Accounts': return '/admin/accounts'
    case 'Customers': return '/admin/customers/search'
    case 'SR': return '/admin/support-requests/list'
    case 'Deals': return '/admin/deals/view'
    case 'Quotations': return '/admin/quotations'
    default: return '/admin/charts'
  }
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
}) => {
  const displayTitle = chart.title || chart.name || 'Untitled Chart'
  const displayType = chart.chartType || chart.type || 'Pie'
  const sourceLabel = chart.source === 'template' ? 'Template' : 'Chart'
  return (
    <div className={`cl-row ${isExpanded ? 'cl-row-expanded' : ''}`}>
      <div className="cl-row-main">
        <div className="cl-row-left">
          <button
            type="button"
            className={`cl-row-toggle ${isExpanded ? 'cl-row-toggle-open' : ''}`}
            onClick={onToggleExpand}
            aria-label={isExpanded ? `Collapse ${displayTitle}` : `Expand ${displayTitle}`}
          >
            <FaChevronDown />
          </button>
          <button
            type="button"
            className="cl-row-title cl-row-title-link"
            onClick={onView}
            title={linkedLabel ? `Open in ${linkedLabel}` : 'View chart'}
          >
            {displayTitle}
          </button>
        </div>

        <div className="cl-row-right">
          <span className="cl-row-badge">{displayType}</span>
          <span className={`cl-row-source cl-row-source--${chart.source === 'template' ? 'template' : 'chart'}`}>
            {sourceLabel}
          </span>
          <div className="cl-row-actions">
            <button type="button" className="cl-action cl-action--edit" title="Edit" onClick={onEdit}>
              <FaPencilAlt />
            </button>
            <button type="button" className="cl-action cl-action--view" title="View" onClick={onView}>
              <FaEye />
            </button>
            <button
              type="button"
              className={`cl-action ${chart.active ? 'cl-action--check-active' : 'cl-action--check'}`}
              title={chart.active ? 'Deactivate' : 'Activate'}
              onClick={onToggleActive}
            >
              <FaCheckCircle />
            </button>
            <button
              type="button"
              className={`cl-action ${chart.mobileEnabled ? 'cl-action--mobile' : 'cl-action--mobile-off'}`}
              title={chart.mobileEnabled ? 'Hide from mobile' : 'Show on mobile'}
              onClick={onToggleMobile}
            >
              <FaMobileAlt />
            </button>
            <button type="button" className="cl-action cl-action--copy" title="Duplicate" onClick={onCopy}>
              <FaCopy />
            </button>
            <button type="button" className="cl-action cl-action--delete" title="Delete" onClick={onDelete}>
              <FaTrash />
            </button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="cl-row-details">
          <dl className="cl-row-detail-grid">
            <dt>Type</dt><dd>{displayType}</dd>
            <dt>Active</dt><dd>{chart.active ? 'Yes' : 'No'}</dd>
            <dt>Visible on mobile</dt><dd>{chart.mobileEnabled ? 'Yes' : 'No'}</dd>
          </dl>
        </div>
      ) : null}
    </div>
  )
}

const ChartsListPage = ({ basePath = '/admin/charts' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { addNotification } = useData()
  const filterOptions = ['All', ...ADMIN_CHART_CATEGORIES]
  const initialFilter = location.state?.newChartCategory || 'All'
  const [activeFilter, setActiveFilter] = useState(initialFilter)
  const [chartData, setChartData] = useState(() => loadAllCharts())
  const [expandedIds, setExpandedIds] = useState({})
  const [statusMessage, setStatusMessage] = useState(null)
  const [previewChart, setPreviewChart] = useState(null)

  useEffect(() => {
    let isMounted = true
    fetchAllChartsFromDb().then((data) => {
      if (isMounted && data) {
        setChartData(data)
      }
    })
    return () => { isMounted = false }
  }, [location.state])

  const rows = useMemo(() => {
    if (activeFilter === 'All') {
      return ADMIN_CHART_CATEGORIES.flatMap((category) => (
        (chartData[category] || []).map((chart) => ({ ...chart, category }))
      ))
    }
    return (chartData[activeFilter] || []).map((chart) => ({ ...chart, category: activeFilter }))
  }, [activeFilter, chartData])

  const flashStatus = (type, text) => {
    setStatusMessage({ type, text })
    window.setTimeout(() => setStatusMessage(null), 2400)
  }

  const getChartCategory = (chart) => chart.category || activeFilter

  const updateChart = (chartId, category, updater) => {
    setChartData((current) => ({
      ...current,
      [category]: (current[category] || []).map((chart) => (
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
    updateChart(chart.id, getChartCategory(chart), (current) => ({ active: !current.active }))
    const nextState = !chart.active ? 'active' : 'inactive'
    flashStatus('success', `"${chart.title}" is now ${nextState}`)
    addNotification('success', 'Chart Updated', `"${chart.title}" is now ${nextState}.`)
  }

  const handleToggleMobile = (chart) => {
    updateChart(chart.id, getChartCategory(chart), (current) => ({ mobileEnabled: !current.mobileEnabled }))
    const nextState = !chart.mobileEnabled ? 'enabled' : 'disabled'
    flashStatus('success', `"${chart.title}" mobile visibility ${nextState}`)
    addNotification('success', 'Mobile Visibility', `"${chart.title}" mobile visibility ${nextState}.`)
  }

  const handleCopy = (chart) => {
    const category = getChartCategory(chart)
    setChartData((current) => {
      const list = current[category] || []
      const originalIndex = list.findIndex((entry) => entry.id === chart.id)
      const duplicate = {
        ...chart,
        category: undefined,
        id: `${chart.id}-copy-${Date.now()}`,
        title: `${chart.title} (Copy)`,
      }
      const next = [...list]
      next.splice(originalIndex + 1, 0, duplicate)
      return { ...current, [category]: next }
    })
    flashStatus('success', `Duplicated "${chart.title}"`)
    addNotification('success', 'Chart Duplicated', `"${chart.title}" was duplicated.`)
  }

  const handleDelete = (chart) => {
    const confirmed = window.confirm(`Delete chart "${chart.title}"?`)
    if (!confirmed) return
    const category = getChartCategory(chart)
    setChartData((current) => ({
      ...current,
      [category]: (current[category] || []).filter((entry) => entry.id !== chart.id),
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
        <main className="cl-main">
          <div className="cl-horizontal-filters">
            {filterOptions.map((filterLabel) => {
              const isActive = activeFilter === filterLabel
              return (
                <button
                  key={filterLabel}
                  type="button"
                  className={`cl-horizontal-filter-item ${isActive ? 'cl-horizontal-filter-item--active' : ''}`}
                  onClick={() => setActiveFilter(filterLabel)}
                >
                  {filterLabel}
                </button>
              )
            })}
          </div>

          <div className="cl-content-panel">
            {rows.length > 0 ? (
              rows.map((chart) => (
                <ChartRow
                  key={chart.id}
                  chart={chart}
                  isExpanded={Boolean(expandedIds[chart.id])}
                  linkedLabel={getCategoryLink(chart.category || activeFilter, basePath) ? chart.category || activeFilter : ''}
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
              <p className="cl-empty">No chart templates available for {activeFilter}.</p>
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
