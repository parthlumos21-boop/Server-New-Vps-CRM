import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaChartPie, FaChevronDown, FaPencilAlt, FaTrash,
} from 'react-icons/fa'
import { ADMIN_CHART_CATEGORIES } from '../../../features/adminCharts/chartDefinitions'
import { loadAllCharts, fetchAllChartsFromDb } from '../../../features/adminCharts/chartStorage'
import { chartApi } from '../../../services/chartApi'
import ChartPreviewModal from './ChartPreviewModal'
import './ChartsListPage.css'

const ChartRow = ({
  chart,
  isExpanded,
  onToggleExpand,
  onEdit,
  onView,
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
            title="View chart"
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
  const filterOptions = ADMIN_CHART_CATEGORIES
  const initialFilter = location.state?.newChartCategory || ADMIN_CHART_CATEGORIES[0]
  const [activeFilter, setActiveFilter] = useState(initialFilter)
  const [chartData, setChartData] = useState(() => loadAllCharts())
  const [expandedIds, setExpandedIds] = useState({})
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
    return (chartData[activeFilter] || []).map((chart) => ({ ...chart, category: activeFilter }))
  }, [activeFilter, chartData])

  const handleToggleExpand = (chartId) => {
    setExpandedIds((current) => ({ ...current, [chartId]: !current[chartId] }))
  }

  const handleView = (chart) => {
    setPreviewChart(chart)
  }

  const handleEdit = (chart) => {
    navigate(`${basePath}/new`, { state: { editChartId: chart.id, editChartTitle: chart.title || chart.name } })
  }

  const handleDelete = async (chart) => {
    const displayTitle = chart.title || chart.name || 'Untitled Chart'
    const confirmed = window.confirm(`Delete chart template "${displayTitle}"?`)
    if (!confirmed) return

    try {
      if (chart.source === 'template') {
        await chartApi.deleteTemplate(chart.templateId || chart.id)
      } else {
        await chartApi.deleteChart(chart.id)
      }
    } catch (error) {
      console.warn('Unable to delete chart from backend, removing it from this view only:', error)
    }

    setChartData((current) => ({
      ...current,
      [chart.category || activeFilter]: (current[chart.category || activeFilter] || []).filter((entry) => entry.id !== chart.id),
    }))
    setExpandedIds((current) => {
      const next = { ...current }
      delete next[chart.id]
      return next
    })
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
                  onToggleExpand={() => handleToggleExpand(chart.id)}
                  onEdit={() => handleEdit(chart)}
                  onView={() => handleView(chart)}
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
