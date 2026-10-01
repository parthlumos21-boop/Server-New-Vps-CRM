import React, { useEffect, useMemo, useState } from 'react'
import { buildCustomerMapViewData } from '../../../features/adminReports/customerMapViewData'
import { customerService } from '../../../services/customerService'
import './CustomerMapViewPage.css'

const MAP_EMBED_URL = 'https://www.openstreetmap.org/export/embed.html?bbox=67%2C6%2C97.5%2C37.5&layer=mapnik'

const CustomerMapViewPage = () => {
  const [refreshTick, setRefreshTick] = useState(0)
  const [plotRequested, setPlotRequested] = useState(true)
  const [plotMode, setPlotMode] = useState('individual')

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTick((currentValue) => currentValue + 1)
    }

    window.addEventListener('storage', handleRefresh)
    window.addEventListener('focus', handleRefresh)

    return () => {
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('focus', handleRefresh)
    }
  }, [])

  const customers = useMemo(() => customerService.getCustomers(), [refreshTick])
  const mapData = useMemo(() => buildCustomerMapViewData(customers), [customers])

  const visibleMarkers = useMemo(() => (
    !plotRequested
      ? []
      : plotMode === 'city-wise'
        ? mapData.cityWiseMarkers.filter((record) => record.viewportPosition)
        : mapData.customersWithLocations.filter((record) => record.viewportPosition)
  ), [mapData.cityWiseMarkers, mapData.customersWithLocations, plotMode, plotRequested])

  const emptyStateVisible = visibleMarkers.length === 0

  return (
    <div className="customer-map-view-page">
      <div className="customer-map-view-topbar">
        <h1>Customer Map View</h1>
        <div className="customer-map-view-topbar-actions">
          <button
            type="button"
            className="customer-map-view-plot-btn"
            onClick={() => setPlotRequested(true)}
          >
            Plot Locations
          </button>
          <select
            value={plotMode}
            onChange={(event) => setPlotMode(event.target.value)}
            className="customer-map-view-mode-select"
          >
            <option value="individual">Individual</option>
            <option value="city-wise">City Wise</option>
          </select>
        </div>
      </div>

      <div className="customer-map-view-summary-strip">
        <div className="customer-map-view-summary-item">
          Customer With Locations: {mapData.customersWithLocations.length}
        </div>
        <div className="customer-map-view-summary-item customer-map-view-summary-item-right">
          Customer Without Locations: {mapData.customersWithoutLocations.length}
        </div>
      </div>

      <section className="customer-map-view-map-shell">
        <div className="customer-map-view-map-frame">
          <iframe
            title="Customer location map"
            src={MAP_EMBED_URL}
            className="customer-map-view-map-embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <div className="customer-map-view-marker-layer" aria-hidden={emptyStateVisible}>
            {visibleMarkers.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`customer-map-view-marker${plotMode === 'city-wise' ? ' customer-map-view-marker-city' : ''}`}
                style={{
                  left: `${record.viewportPosition.leftPercent}%`,
                  top: `${record.viewportPosition.topPercent}%`,
                }}
                title={plotMode === 'city-wise'
                  ? record.title
                  : `${record.name}${record.address ? ` - ${record.address}` : ''}`}
              >
                <span className="customer-map-view-marker-dot">
                  {plotMode === 'city-wise' ? record.count : ''}
                </span>
                <span className="customer-map-view-marker-label">
                  {plotMode === 'city-wise' ? record.label : (record.cityLabel ? `${record.name} - ${record.cityLabel}` : record.name)}
                </span>
              </button>
            ))}
          </div>

          {emptyStateVisible && (
            <div className="customer-map-view-empty-overlay">
              <p>There are no Customer with locations configured in India.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default CustomerMapViewPage
