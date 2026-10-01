import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaChevronLeft,
  FaFilter,
  FaGripVertical,
  FaPlus,
  FaSortAlphaDown,
  FaTimes,
} from 'react-icons/fa'
import { useData } from '../../../context/DataContext'
import './ViewSettingsSubPage.css'

const STORAGE_PREFIX = 'view-settings:'

const buildStorageKey = (title) =>
  `${STORAGE_PREFIX}${String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`

const readSavedSettings = (storageKey) => {
  if (typeof window === 'undefined' || !storageKey) return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const createFilterRow = () => ({
  id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  fieldKey: '',
  value: '',
  negated: false,
})

const createOrderByRow = () => ({
  id: `orderby-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  fieldKey: '',
  direction: 'asc',
})

/*
  Modes:
  - simple=true                -> topbar + field picker only (Account Source View)
  - simpleClassification=true  -> topbar + ViewType card + ViewClassification card + field picker (My Customers View)
  - default                    -> full page: all sections (My Accounts View)
*/
const ViewSettingsSubPage = ({
  title,
  fields,
  defaultSelected,
  statuses = [],
  classificationField = 'Account Status',
  classificationGroups = null,
  defaultClassificationField = '',
  includeClassificationPlaceholder = false,
  actions = [],
  leftPanelTitle = 'Attributes',
  filterFieldOptions = null,
  filterValueOptionsByField = null,
  orderByFieldOptions = null,
  simple = false,
  simpleClassification = false,
  defaultViewClassificationOn = false,
  defaultFiltersOn = false,
  defaultOrderByOn = false,
  defaultDisableDragDropGrid = true,
  basePath = '/admin/view-settings',
}) => {
  const navigate = useNavigate()
  const { addNotification } = useData()

  const storageKey = useMemo(() => buildStorageKey(title), [title])
  const savedSettings = useMemo(() => readSavedSettings(storageKey), [storageKey])

  const normalizedClassificationGroups = useMemo(() => {
    if (classificationGroups && Object.keys(classificationGroups).length > 0) {
      return classificationGroups
    }
    if (statuses.length > 0) {
      return { [classificationField]: statuses }
    }
    return {}
  }, [classificationField, classificationGroups, statuses])

  const classificationFields = useMemo(
    () => Object.keys(normalizedClassificationGroups),
    [normalizedClassificationGroups]
  )
  const resolvedFilterFieldOptions = useMemo(
    () => (Array.isArray(filterFieldOptions) && filterFieldOptions.length > 0 ? filterFieldOptions : fields),
    [fields, filterFieldOptions]
  )
  const resolvedOrderByFieldOptions = useMemo(
    () => (Array.isArray(orderByFieldOptions) && orderByFieldOptions.length > 0 ? orderByFieldOptions : fields),
    [fields, orderByFieldOptions]
  )

  const resolvedDefaultClassificationField = useMemo(() => {
    if (
      defaultClassificationField
      && classificationFields.includes(defaultClassificationField)
    ) {
      return defaultClassificationField
    }
    if (classificationFields.includes(classificationField)) {
      return classificationField
    }
    return classificationFields[0] || ''
  }, [classificationField, classificationFields, defaultClassificationField])

  const [viewType, setViewType] = useState(() => savedSettings?.viewType || 'Tabular')
  const [classifyOn, setClassifyOn] = useState(() => (
    typeof savedSettings?.classifyOn === 'boolean' ? savedSettings.classifyOn : true
  ))
  const [viewClassifyOn, setViewClassifyOn] = useState(() => (
    typeof savedSettings?.viewClassifyOn === 'boolean'
      ? savedSettings.viewClassifyOn
      : defaultViewClassificationOn
  ))
  const [disableDragDropGrid, setDisableDragDropGrid] = useState(() => {
    if (typeof savedSettings?.disableDragDropGrid === 'boolean') {
      return savedSettings.disableDragDropGrid
    }
    if (typeof savedSettings?.dragDropGrid === 'boolean') {
      return savedSettings.dragDropGrid
    }
    return defaultDisableDragDropGrid
  })
  const [filtersOn, setFiltersOn] = useState(() => (
    typeof savedSettings?.filtersOn === 'boolean' ? savedSettings.filtersOn : defaultFiltersOn
  ))
  const [orderByOn, setOrderByOn] = useState(() => (
    typeof savedSettings?.orderByOn === 'boolean' ? savedSettings.orderByOn : defaultOrderByOn
  ))
  const [selectedClassificationField, setSelectedClassificationField] = useState(() => {
    const savedField = savedSettings?.selectedClassificationField
    if (savedField && classificationFields.includes(savedField)) {
      return savedField
    }
    return resolvedDefaultClassificationField
  })

  const [activeClassificationValues, setActiveClassificationValues] = useState(() => {
    const defaults = Object.entries(normalizedClassificationGroups).reduce((accumulator, [fieldName, options]) => ({
      ...accumulator,
      [fieldName]: options.reduce((fieldAccumulator, option) => ({
        ...fieldAccumulator,
        [option]: false,
      }), {}),
    }), {})

    const savedValues = savedSettings?.activeClassificationValues
    if (savedValues && typeof savedValues === 'object') {
      classificationFields.forEach((fieldName) => {
        const fieldState = savedValues[fieldName]
        if (fieldState && typeof fieldState === 'object') {
          normalizedClassificationGroups[fieldName].forEach((option) => {
            if (Object.prototype.hasOwnProperty.call(fieldState, option)) {
              defaults[fieldName][option] = !!fieldState[option]
            }
          })
        }
      })
    } else if (savedSettings?.activeStatuses && resolvedDefaultClassificationField) {
      const legacyState = savedSettings.activeStatuses
      if (legacyState && typeof legacyState === 'object') {
        normalizedClassificationGroups[resolvedDefaultClassificationField]?.forEach((option) => {
          if (Object.prototype.hasOwnProperty.call(legacyState, option)) {
            defaults[resolvedDefaultClassificationField][option] = !!legacyState[option]
          }
        })
      }
    }

    return defaults
  })

  const [checkedActions, setCheckedActions] = useState(() => {
    const defaults = actions.reduce((accumulator, action) => ({
      ...accumulator,
      [action.label]: action.defaultChecked || false,
    }), {})
    if (savedSettings?.checkedActions && typeof savedSettings.checkedActions === 'object') {
      actions.forEach((action) => {
        if (Object.prototype.hasOwnProperty.call(savedSettings.checkedActions, action.label)) {
          defaults[action.label] = !!savedSettings.checkedActions[action.label]
        }
      })
    }
    return defaults
  })

  const [filterRows, setFilterRows] = useState(() => {
    if (Array.isArray(savedSettings?.filterRows) && savedSettings.filterRows.length > 0) {
      return savedSettings.filterRows.map((row) => ({
        id: row?.id || createFilterRow().id,
        fieldKey: row?.fieldKey || '',
        value: row?.value || '',
        negated: !!row?.negated,
      }))
    }
    return [createFilterRow()]
  })

  const [orderByRows, setOrderByRows] = useState(() => {
    if (Array.isArray(savedSettings?.orderByRows)) {
      return savedSettings.orderByRows.map((row) => ({
        id: row?.id || createOrderByRow().id,
        fieldKey: row?.fieldKey || '',
        direction: row?.direction === 'desc' ? 'desc' : 'asc',
      }))
    }
    return []
  })

  const [selected, setSelected] = useState(() => {
    const savedSelected = Array.isArray(savedSettings?.selected)
      ? savedSettings.selected.filter((fieldName) => fields.includes(fieldName))
      : null
    return savedSelected && savedSelected.length > 0 ? savedSelected : defaultSelected
  })
  const [available, setAvailable] = useState(() => fields.filter((fieldName) => !selected.includes(fieldName)))

  const activeClassificationOptions = normalizedClassificationGroups[selectedClassificationField] || []
  const activeClassificationState = activeClassificationValues[selectedClassificationField] || {}
  const allClassificationOptionsOn = activeClassificationOptions.length > 0
    && activeClassificationOptions.every((option) => activeClassificationState[option])

  useEffect(() => {
    setAvailable((current) => {
      const next = fields.filter((fieldName) => !selected.includes(fieldName))
      if (current.length === next.length && current.every((fieldName, index) => next[index] === fieldName)) {
        return current
      }
      return next
    })
  }, [fields, selected])

  useEffect(() => {
    if (!selectedClassificationField && resolvedDefaultClassificationField) {
      setSelectedClassificationField(resolvedDefaultClassificationField)
      return
    }

    if (
      selectedClassificationField
      && !classificationFields.includes(selectedClassificationField)
      && resolvedDefaultClassificationField
    ) {
      setSelectedClassificationField(resolvedDefaultClassificationField)
    }
  }, [classificationFields, resolvedDefaultClassificationField, selectedClassificationField])

  const handleSave = () => {
    if (typeof window === 'undefined' || !storageKey) return
    try {
      const payload = {
        viewType,
        classifyOn,
        viewClassifyOn,
        disableDragDropGrid,
        filtersOn,
        orderByOn,
        selectedClassificationField,
        activeClassificationValues,
        checkedActions,
        filterRows,
        orderByRows,
        selected,
        savedAt: new Date().toISOString(),
      }
      window.localStorage.setItem(storageKey, JSON.stringify(payload))
      addNotification('success', `${title} saved`, 'Your view settings were saved.')
    } catch (error) {
      addNotification('error', 'Save failed', error?.message || 'Unable to save view settings.')
    }
  }

  const addField = (fieldName) => {
    setAvailable((current) => current.filter((entry) => entry !== fieldName))
    setSelected((current) => [...current, fieldName])
  }

  const removeField = (fieldName) => {
    setSelected((current) => current.filter((entry) => entry !== fieldName))
    setAvailable((current) => [...current, fieldName])
  }

  const toggleClassificationOption = (option) => {
    setActiveClassificationValues((current) => ({
      ...current,
      [selectedClassificationField]: {
        ...(current[selectedClassificationField] || {}),
        [option]: !current[selectedClassificationField]?.[option],
      },
    }))
  }

  const toggleAllClassificationOptions = () => {
    setActiveClassificationValues((current) => ({
      ...current,
      [selectedClassificationField]: activeClassificationOptions.reduce((accumulator, option) => ({
        ...accumulator,
        [option]: !allClassificationOptionsOn,
      }), {}),
    }))
  }

  const toggleAction = (label) => setCheckedActions((current) => ({
    ...current,
    [label]: !current[label],
  }))

  const handleUpdateFilterRow = (rowId, updates) => {
    setFilterRows((current) => current.map((row) => (
      row.id === rowId ? { ...row, ...updates, ...(updates.fieldKey ? { value: '' } : {}) } : row
    )))
  }

  const handleAddFilterRow = () => {
    setFilterRows((current) => [...current, createFilterRow()])
  }

  const handleRemoveFilterRow = (rowId) => {
    setFilterRows((current) => (
      current.length <= 1 ? [createFilterRow()] : current.filter((row) => row.id !== rowId)
    ))
  }

  const handleUpdateOrderByRow = (rowId, updates) => {
    setOrderByRows((current) => current.map((row) => (
      row.id === rowId ? { ...row, ...updates } : row
    )))
  }

  const handleAddOrderByRow = () => {
    setOrderByRows((current) => [...current, createOrderByRow()])
  }

  const handleRemoveOrderByRow = (rowId) => {
    setOrderByRows((current) => current.filter((row) => row.id !== rowId))
  }

  return (
    <div className="vc-page">

      <div className="vc-topbar">
        <button
          type="button"
          className="vc-back-btn"
          onClick={() => navigate(basePath)}
        >
          <FaChevronLeft />
          {title}
        </button>
        <button type="button" className="vc-save-btn" onClick={handleSave}>Save</button>
      </div>

      {!simple && simpleClassification && (
        <>
          <div className="vc-cards-area">
            <div className="vc-card">
              <span className="vc-card-label">View Type</span>
              <select
                className="vc-vt-select"
                value={viewType}
                onChange={(event) => setViewType(event.target.value)}
              >
                <option>Tabular</option>
                <option>Grid</option>
                <option>Kanban</option>
              </select>
            </div>
          </div>

          {classificationFields.length > 0 && (
            <div className="vc-section vc-simple-classify-section">
              <div className="vc-classify-header">
                <span className="vc-classify-title">View Classification</span>
                <span className={`vc-toggle-word ${viewClassifyOn ? 'vc-toggle-word--yes' : 'vc-toggle-word--no'}`}>
                  {viewClassifyOn ? 'YES' : 'NO'}
                </span>
                <button
                  type="button"
                  className={`vc-toggle vc-toggle--green ${viewClassifyOn ? 'vc-toggle--on' : ''}`}
                  onClick={() => setViewClassifyOn((value) => !value)}
                >
                  <span className="vc-toggle-knob" />
                </button>
              </div>

              {viewClassifyOn && (
                <div className="vc-simple-classify-body">
                  <div className="vc-simple-classify-tabs">
                    {classificationFields.map((fieldName) => {
                      const isActive = selectedClassificationField === fieldName
                      return (
                        <button
                          key={fieldName}
                          type="button"
                          className="vc-simple-classify-tab"
                          onClick={() => setSelectedClassificationField(fieldName)}
                        >
                          <span className={`vc-mini-toggle ${isActive ? 'vc-mini-toggle--on' : 'vc-mini-toggle--off'}`}>
                            {isActive ? 'ON' : 'OFF'}
                          </span>
                          <span>{fieldName}</span>
                        </button>
                      )
                    })}
                  </div>

                  {activeClassificationOptions.length > 0 && (
                    <div className="vc-choice-box">
                      <div className="vc-status-hint-row">
                        <span className="vc-status-hint">
                          Please select {selectedClassificationField}
                        </span>
                        <button
                          type="button"
                          className={`vc-mini-toggle ${allClassificationOptionsOn ? 'vc-mini-toggle--on' : 'vc-mini-toggle--off'}`}
                          onClick={toggleAllClassificationOptions}
                        >
                          {allClassificationOptionsOn ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className="vc-all-btn" onClick={toggleAllClassificationOptions}>
                          All
                        </button>
                      </div>

                      <div className="vc-chips">
                        {activeClassificationOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`vc-chip ${activeClassificationState[option] ? 'vc-chip--on' : 'vc-chip--off'}`}
                            onClick={() => toggleClassificationOption(option)}
                          >
                            <span className="vc-chip-state">{activeClassificationState[option] ? 'ON' : 'OFF'}</span>
                            <span className="vc-chip-square" />
                            <span className="vc-chip-label">{option}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!simple && !simpleClassification && (
        <div className="vc-section vc-vt-section">
          <span className="vc-vt-label">View Type</span>
          <select
            className="vc-vt-select"
            value={viewType}
            onChange={(event) => setViewType(event.target.value)}
          >
            <option>Tabular</option>
            <option>Grid</option>
            <option>Kanban</option>
          </select>
        </div>
      )}

      {!simple && !simpleClassification && (
        <div className="vc-section vc-classify-section">
          <div className="vc-classify-header">
            <span className="vc-classify-title">
              Configure the View based on Classification
            </span>
            <span className={`vc-toggle-word ${classifyOn ? 'vc-toggle-word--yes' : 'vc-toggle-word--no'}`}>
              {classifyOn ? 'YES' : 'NO'}
            </span>
            <button
              type="button"
              className={`vc-toggle vc-toggle--green ${classifyOn ? 'vc-toggle--on' : ''}`}
              onClick={() => setClassifyOn((value) => !value)}
            >
              <span className="vc-toggle-knob" />
            </button>
          </div>

          {classifyOn && (
            <div className="vc-classify-body">
              <div className="vc-cf-row">
                <span className="vc-cf-label">Classification Field</span>
                <select
                  className="vc-cf-select"
                  value={selectedClassificationField}
                  onChange={(event) => setSelectedClassificationField(event.target.value)}
                >
                  {includeClassificationPlaceholder && (
                    <option value="">Select</option>
                  )}
                  {classificationFields.map((fieldName) => (
                    <option key={fieldName} value={fieldName}>{fieldName}</option>
                  ))}
                </select>
              </div>

              {activeClassificationOptions.length > 0 && (
                <>
                  <div className="vc-choice-box">
                    <div className="vc-status-hint-row">
                      <span className="vc-status-hint">
                        Please select {selectedClassificationField} to be listed in view
                      </span>
                      <button
                        type="button"
                        className={`vc-mini-toggle ${allClassificationOptionsOn ? 'vc-mini-toggle--on' : 'vc-mini-toggle--off'}`}
                        onClick={toggleAllClassificationOptions}
                      >
                        {allClassificationOptionsOn ? 'ON' : 'OFF'}
                      </button>
                      <button type="button" className="vc-all-btn" onClick={toggleAllClassificationOptions}>
                        All
                      </button>
                    </div>

                    <div className="vc-chips">
                      {activeClassificationOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`vc-chip ${activeClassificationState[option] ? 'vc-chip--on' : 'vc-chip--off'}`}
                          onClick={() => toggleClassificationOption(option)}
                        >
                          <span className="vc-chip-state">{activeClassificationState[option] ? 'ON' : 'OFF'}</span>
                          <span className="vc-chip-square" />
                          <span className="vc-chip-label">{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="vc-checkbox-row">
                    <input
                      type="checkbox"
                      checked={disableDragDropGrid}
                      onChange={(event) => setDisableDragDropGrid(event.target.checked)}
                    />
                    <span>Disable Drag &amp; Drop in view (Only for GRID View)</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!simple && !simpleClassification && (
        <div className="vc-config-grid">
          <div className="vc-section vc-config-section">
            <div className="vc-config-header">
              <span className="vc-config-title">Add Additional Filters</span>
              <div className="vc-config-toggle-wrap">
                <span className={`vc-toggle-word ${filtersOn ? 'vc-toggle-word--yes' : 'vc-toggle-word--no'}`}>
                  {filtersOn ? 'YES' : 'NO'}
                </span>
                <button
                  type="button"
                  className={`vc-toggle vc-toggle--warm ${filtersOn ? 'vc-toggle--on' : ''}`}
                  onClick={() => setFiltersOn((value) => !value)}
                >
                  <span className="vc-toggle-knob" />
                </button>
              </div>
            </div>

            <div className="vc-config-body">
              {filtersOn ? (
                <div className="vc-config-card">
                  <div className="vc-config-card-header">
                    <FaFilter />
                    <span>Configure Filters</span>
                  </div>
                  <div className="vc-config-card-body">
                    {filterRows.map((row, index) => {
                      const rowValues = filterValueOptionsByField?.[row.fieldKey]
                        || normalizedClassificationGroups[row.fieldKey]
                        || []
                      return (
                        <div key={row.id} className="vc-filter-row">
                          <span className="vc-filter-prefix">{index === 0 ? 'If' : 'And'}</span>
                          <select
                            className="vc-inline-select vc-inline-select--field"
                            value={row.fieldKey}
                            onChange={(event) => handleUpdateFilterRow(row.id, { fieldKey: event.target.value })}
                          >
                            <option value="">Select</option>
                            {resolvedFilterFieldOptions.map((fieldName) => (
                              <option key={fieldName} value={fieldName}>{fieldName}</option>
                            ))}
                          </select>
                          <label className="vc-filter-not">
                            <input
                              type="checkbox"
                              checked={row.negated}
                              onChange={(event) => handleUpdateFilterRow(row.id, { negated: event.target.checked })}
                            />
                            <span>not</span>
                          </label>
                          <select
                            className="vc-inline-select vc-inline-select--value"
                            value={row.value}
                            onChange={(event) => handleUpdateFilterRow(row.id, { value: event.target.value })}
                          >
                            <option value="">select</option>
                            {rowValues.map((value) => (
                              <option key={value} value={value}>{value}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="vc-icon-btn vc-icon-btn--add"
                            onClick={handleAddFilterRow}
                            aria-label="Add filter row"
                          >
                            <FaPlus />
                          </button>
                          {filterRows.length > 1 && (
                            <button
                              type="button"
                              className="vc-icon-btn vc-icon-btn--remove"
                              onClick={() => handleRemoveFilterRow(row.id)}
                              aria-label="Remove filter row"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="vc-config-placeholder" />
              )}
            </div>
          </div>

          <div className="vc-section vc-config-section vc-config-section--compact">
            <div className="vc-config-header">
              <span className="vc-config-title">Add Order By</span>
              <div className="vc-config-toggle-wrap">
                <span className={`vc-toggle-word ${orderByOn ? 'vc-toggle-word--yes' : 'vc-toggle-word--no'}`}>
                  {orderByOn ? 'YES' : 'NO'}
                </span>
                <button
                  type="button"
                  className={`vc-toggle vc-toggle--green ${orderByOn ? 'vc-toggle--on' : ''}`}
                  onClick={() => setOrderByOn((value) => !value)}
                >
                  <span className="vc-toggle-knob" />
                </button>
              </div>
            </div>

            <div className="vc-config-body">
              {orderByOn ? (
                  <div className="vc-config-card">
                  <div className="vc-config-card-header">
                    <span className="vc-order-symbol">#</span>
                    <span>Order By</span>
                  </div>
                  <div className="vc-config-card-body vc-config-card-body--stacked">
                    {orderByRows.map((row) => (
                      <div key={row.id} className="vc-order-row">
                        <select
                          className="vc-inline-select"
                          value={row.fieldKey}
                          onChange={(event) => handleUpdateOrderByRow(row.id, { fieldKey: event.target.value })}
                        >
                          <option value="">Select</option>
                          {resolvedOrderByFieldOptions.map((fieldName) => (
                            <option key={fieldName} value={fieldName}>{fieldName}</option>
                          ))}
                        </select>
                        <select
                          className="vc-inline-select vc-inline-select--direction"
                          value={row.direction}
                          onChange={(event) => handleUpdateOrderByRow(row.id, { direction: event.target.value })}
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                        <button
                          type="button"
                          className="vc-icon-btn vc-icon-btn--remove"
                          onClick={() => handleRemoveOrderByRow(row.id)}
                          aria-label="Remove order by row"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="vc-plus-tile"
                      onClick={handleAddOrderByRow}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="vc-config-placeholder" />
              )}
            </div>
          </div>
        </div>
      )}

      {!simple && !simpleClassification && actions.length > 0 && (
        <div className="vc-section vc-actions-section">
          <span className="vc-actions-label">Actions</span>
          <div className="vc-actions-grid">
            {actions.map((action) => (
              <label key={action.label} className="vc-action-item">
                <input
                  type="checkbox"
                  checked={checkedActions[action.label] || false}
                  onChange={() => toggleAction(action.label)}
                />
                <span>{action.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="vc-fields-row">
        <div className="vc-field-panel">
          <div className="vc-panel-header">{leftPanelTitle}</div>
          <div className="vc-field-list">
            {available.map((fieldName) => (
              <button
                key={fieldName}
                type="button"
                className="vc-field-item"
                onClick={() => addField(fieldName)}
                title="Click to add"
              >
                <FaGripVertical className="vc-grip" />
                <span>{fieldName}</span>
              </button>
            ))}
            {available.length === 0 && (
              <div className="vc-field-empty">All fields selected</div>
            )}
          </div>
        </div>

        <div className="vc-field-panel">
          <div className="vc-panel-header">Selected Fields</div>
          <div className="vc-field-hint-row">
            Drag and drop to reorder the fields in listing
          </div>
          <div className="vc-field-list">
            {selected.map((fieldName) => (
              <div key={fieldName} className="vc-field-item vc-field-item--sel">
                <FaGripVertical className="vc-grip" />
                <span className="vc-field-name">{fieldName}</span>
                <button
                  type="button"
                  className="vc-remove-btn"
                  onClick={() => removeField(fieldName)}
                  title="Remove"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            {selected.length === 0 && (
              <div className="vc-field-empty">No fields selected</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSettingsSubPage
