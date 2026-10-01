import React from 'react'
import { FiMapPin } from 'react-icons/fi'

const formatCoordinate = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return String(value || '').trim()
  }

  return numericValue.toFixed(7)
}

const formatAccuracy = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return ''
  }

  return ` | Accuracy ${Math.round(numericValue)} m`
}

const SupportRequestLocationMap = ({ supportRequest }) => {
  const latitude = formatCoordinate(supportRequest?.latitude)
  const longitude = formatCoordinate(supportRequest?.longitude)
  const hasCoordinates = Boolean(latitude && longitude)

  if (!supportRequest?.locationName && !hasCoordinates) {
    return (
      <p className="support-request-live-location-empty">
        No live location captured for this support request.
      </p>
    )
  }

  const locationTitle = supportRequest.locationName || 'Live Location'
  const coordinateText = hasCoordinates
    ? `${latitude}, ${longitude}${formatAccuracy(supportRequest.locationAccuracy)}`
    : 'Coordinates not available'

  return (
    <div className="support-request-live-location" aria-label="Support request live location">
      <div className={`support-request-live-location-map${hasCoordinates ? ' support-request-live-location-map--selected' : ''}`}>
        <div className="support-request-live-location-controls" aria-hidden="true">
          <span>+</span>
          <span>-</span>
        </div>

        <div className="support-request-live-location-marker" aria-hidden="true">
          <FiMapPin />
        </div>

        <div className="support-request-live-location-caption">
          <strong>{locationTitle}</strong>
          <span>{coordinateText}</span>
        </div>
      </div>
    </div>
  )
}

export default SupportRequestLocationMap
