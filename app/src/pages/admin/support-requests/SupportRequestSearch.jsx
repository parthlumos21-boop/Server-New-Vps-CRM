import React, { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import {
  SUPPORT_REQUEST_TYPE_OPTIONS,
  formatSupportRequestType,
  getSupportRequestBasePath,
} from './SupportRequestShared'
import SupportRequestTable, { getSupportRequestValue, normalizeValue } from './SupportRequestTable'
import './SupportRequestView.css'

const SEARCH_FIELDS = [
  { value: 'customerNumber', label: 'Customer Number', type: 'text' },
  { value: 'srNumber', label: 'SR Number', type: 'text' },
  { value: 'requestDate', label: 'Request Date', type: 'date' },
  { value: 'requestType', label: 'Request Type', type: 'select', options: SUPPORT_REQUEST_TYPE_OPTIONS },
  { value: 'ownerName', label: 'Owner', type: 'text' },
  { value: 'status', label: 'Status', type: 'select', options: ['open', 'in-progress', 'on-hold', 'resolved', 'closed'] },
  { value: 'endDate', label: 'End Date', type: 'date' },
  { value: 'description', label: 'Description', type: 'text' },
  { value: 'materialList', label: 'Material List', type: 'text' },
  { value: 'totalVisitGiven', label: 'Total Visit Given', type: 'text' },
  { value: 'underWarranty', label: 'Under Warranty', type: 'select', options: ['Yes', 'No'] },
  { value: 'contactEmail', label: 'Contact Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'sitePerson', label: 'Site Person', type: 'text' },
  { value: 'address', label: 'Address', type: 'text' },
  { value: 'contactPerson', label: 'Contact Person', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'attendingRequirements', label: 'Attending Requirements', type: 'text' },
  { value: 'onSiteRequirements', label: 'On-Site Requirements', type: 'text' },
  { value: 'onHoldReason', label: 'On Hold Reason', type: 'text' },
  { value: 'postponedReason', label: 'Postponed Reason', type: 'text' },
  { value: 'addedByName', label: 'Added By', type: 'text' },
  { value: 'addedOn', label: 'Added On', type: 'date' },
  { value: 'reopenedOn', label: 'Re-Opened On', type: 'date' },
  { value: 'lastUpdated', label: 'Last Updated', type: 'date' },
]

const SEARCH_RESULT_COLUMNS = [
  { key: 'srNumber', label: 'SR Number' },
  { key: 'customerNumber', label: 'Customer Number' },
  { key: 'description', label: 'Description' },
  { key: 'requestDate', label: 'Request Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
  { key: 'ownerName', label: 'Owner' },
  { key: 'requestType', label: 'Request Type' },
  { key: 'status', label: 'Status' },
  { key: 'note', label: 'Note' },
]

const TEXT_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: 'equals' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'isEmpty', label: 'is empty' },
]

const DATE_OPERATORS = [
  { value: 'on', label: 'on' },
  { value: 'before', label: 'before' },
  { value: 'after', label: 'after' },
  { value: 'isEmpty', label: 'is empty' },
]

const buildConditionRow = () => ({
  id: `sr-search-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  fieldKey: '',
  negated: false,
  operator: 'contains',
  value: '',
})

const normalizeDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getSearchDateValue = (supportRequest, fieldKey) => {
  switch (fieldKey) {
    case 'requestDate':
      return supportRequest.srDate || supportRequest.requestDate || supportRequest.createdAt
    case 'endDate':
      return supportRequest.endDate || supportRequest.closedOn
    case 'addedOn':
      return supportRequest.addedOn || supportRequest.createdAt
    case 'lastUpdated':
      return supportRequest.updatedAt || supportRequest.lastUpdated || supportRequest.createdAt
    default:
      return supportRequest[fieldKey]
  }
}

const SupportRequestSearch = () => {
  const location = useLocation()
  const { supportRequests } = useData()
  const basePath = getSupportRequestBasePath(location.pathname)
  const [conditions, setConditions] = useState([buildConditionRow()])

  const activeConditions = useMemo(
    () => conditions.filter((condition) => condition.fieldKey),
    [conditions]
  )
  const hasSearched = activeConditions.length > 0

  const searchResults = useMemo(() => {
    if (activeConditions.length === 0) return []

    return supportRequests.filter((supportRequest) => {
      return activeConditions.every((condition) => {
        const fieldConfig = SEARCH_FIELDS.find((field) => field.value === condition.fieldKey)
        if (!fieldConfig) return true

        let matched = true

        if (fieldConfig.type === 'date') {
          const recordDate = normalizeDate(getSearchDateValue(supportRequest, fieldConfig.value))
          const targetDate = normalizeDate(condition.value)

          if (condition.operator === 'isEmpty') {
            matched = !recordDate
          } else if (!targetDate) {
            matched = true
          } else if (condition.operator === 'before') {
            matched = recordDate < targetDate
          } else if (condition.operator === 'after') {
            matched = recordDate > targetDate
          } else {
            matched = recordDate === targetDate
          }
        } else {
          const recordValue = normalizeValue(getSupportRequestValue(supportRequest, fieldConfig.value))
          const targetValue = normalizeValue(condition.value)

          if (condition.operator === 'isEmpty') {
            matched = !recordValue
          } else if (!targetValue) {
            matched = true
          } else if (condition.operator === 'equals') {
            matched = recordValue === targetValue
          } else if (condition.operator === 'startsWith') {
            matched = recordValue.startsWith(targetValue)
          } else if (condition.operator === 'endsWith') {
            matched = recordValue.endsWith(targetValue)
          } else {
            matched = recordValue.includes(targetValue)
          }
        }

        return condition.negated ? !matched : matched
      })
    })
  }, [activeConditions, supportRequests])

  const handleConditionChange = (conditionId, key, value) => {
    setConditions((currentConditions) => currentConditions.map((condition) => {
      if (condition.id !== conditionId) return condition

      if (key === 'fieldKey') {
        const fieldConfig = SEARCH_FIELDS.find((field) => field.value === value)
        return {
          ...condition,
          fieldKey: value,
          operator: fieldConfig?.type === 'date' ? 'on' : 'contains',
          value: '',
        }
      }

      if (key === 'operator') {
        return {
          ...condition,
          operator: value,
          value: value === 'isEmpty' ? '' : condition.value,
        }
      }

      return {
        ...condition,
        [key]: value,
      }
    }))
  }

  const handleAddCondition = () => {
    setConditions((currentConditions) => [...currentConditions, buildConditionRow()])
  }

  const handleRemoveCondition = (conditionId) => {
    setConditions((currentConditions) => (
      currentConditions.length === 1
        ? currentConditions
        : currentConditions.filter((condition) => condition.id !== conditionId)
    ))
  }

  const handleRefineSearch = () => {
    setConditions([buildConditionRow()])
  }

  return (
    <div className="support-request-search-page">
      <section className="support-request-search-shell">
        <header className="support-request-search-header">
          <h1>Search Support Request</h1>
        </header>

        <div className="support-request-search-panel">
          {conditions.map((condition, index) => {
            const selectedField = SEARCH_FIELDS.find((field) => field.value === condition.fieldKey)
            const operatorOptions = selectedField?.type === 'date' ? DATE_OPERATORS : TEXT_OPERATORS
            const shouldHideValue = condition.operator === 'isEmpty'

            return (
              <div key={condition.id} className="support-request-search-row">
                <span className="support-request-search-prefix">{index === 0 ? 'If' : 'And'}</span>

                <select
                  className="support-request-search-select support-request-search-select-field"
                  value={condition.fieldKey}
                  onChange={(event) => handleConditionChange(condition.id, 'fieldKey', event.target.value)}
                >
                  <option value="">Select SR Field</option>
                  {SEARCH_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>

                <span className="support-request-search-operator-label">is</span>

                <label className="support-request-search-negate">
                  <input
                    type="checkbox"
                    checked={condition.negated}
                    onChange={(event) => handleConditionChange(condition.id, 'negated', event.target.checked)}
                  />
                  <span>not</span>
                </label>

                <select
                  className="support-request-search-select support-request-search-select-operator"
                  value={condition.operator}
                  onChange={(event) => handleConditionChange(condition.id, 'operator', event.target.value)}
                  disabled={!condition.fieldKey}
                >
                  {operatorOptions.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>

                {!shouldHideValue ? (
                  selectedField?.type === 'date' ? (
                    <input
                      type="date"
                      className="support-request-search-input support-request-search-input-value"
                      value={condition.value}
                      onChange={(event) => handleConditionChange(condition.id, 'value', event.target.value)}
                      disabled={!condition.fieldKey}
                    />
                  ) : selectedField?.type === 'select' ? (
                    <select
                      className="support-request-search-select support-request-search-select-value"
                      value={condition.value}
                      onChange={(event) => handleConditionChange(condition.id, 'value', event.target.value)}
                      disabled={!condition.fieldKey}
                    >
                      <option value="">All</option>
                      {selectedField.options.map((option) => {
                        const optionValue = typeof option === 'object' ? option.value : option
                        return (
                          <option key={optionValue} value={optionValue}>
                            {typeof option === 'object' ? option.label : formatSupportRequestType(option)}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="support-request-search-input support-request-search-input-value"
                      value={condition.value}
                      onChange={(event) => handleConditionChange(condition.id, 'value', event.target.value)}
                      placeholder="Enter value"
                      disabled={!condition.fieldKey}
                    />
                  )
                ) : null}

                <button
                  type="button"
                  className="support-request-search-add"
                  onClick={handleAddCondition}
                  aria-label="Add search condition"
                >
                  +
                </button>

                {conditions.length > 1 ? (
                  <button
                    type="button"
                    className="support-request-search-remove"
                    onClick={() => handleRemoveCondition(condition.id)}
                    aria-label="Remove search condition"
                  >
                    x
                  </button>
                ) : null}

                {index === 0 && hasSearched ? (
                  <button
                    type="button"
                    className="support-request-search-refine"
                    onClick={handleRefineSearch}
                  >
                    Refine Search
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {hasSearched ? (
        <section className="support-ticket-content support-ticket-content--legacy support-request-search-results">
          <SupportRequestTable
            title="Search SR Results"
            rows={searchResults}
            columns={SEARCH_RESULT_COLUMNS}
            basePath={basePath}
            showActionMenu
            emptyMessage="No Support Request Found"
            exportFilename="search-sr-results.xlsx"
            exportCompact
            excelLike
          />
        </section>
      ) : null}
    </div>
  )
}

export default SupportRequestSearch
