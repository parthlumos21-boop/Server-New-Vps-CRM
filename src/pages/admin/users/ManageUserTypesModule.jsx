import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  FaArchive,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClone,
  FaEdit,
  FaEye,
  FaLayerGroup,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaTrash,
} from 'react-icons/fa'
import Badge from '../../../components/common/Badge'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Input from '../../../components/common/Input'
import { SOCKET_EVENTS } from '../../../constants/socketEvents'
import { useAuth } from '../../../context/AuthContext'
import { userTypeApi } from '../../../services/userTypeApi'
import './ManageUserTypesModule.css'

const formatDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString()
}

const buildPermissionLookup = (groups = []) => {
  const lookup = {}
  groups.forEach((group) => {
    (group.permissions || []).forEach((permission) => {
      const fullKey = `${group.key}.${permission.key}`
      lookup[fullKey] = {
        ...permission,
        fullKey,
        groupKey: group.key,
        groupLabel: group.label,
      }
    })
  })
  return lookup
}

const buildDependentsLookup = (permissionLookup = {}) => {
  const dependents = {}
  Object.values(permissionLookup).forEach((permission) => {
    (permission.dependencies || []).forEach((dependencyKey) => {
      dependents[dependencyKey] = dependents[dependencyKey] || []
      dependents[dependencyKey].push(permission.fullKey)
    })
  })
  return dependents
}

const createPermissionState = (groups = [], sourcePermissions = {}) => {
  const next = {}
  groups.forEach((group) => {
    (group.permissions || []).forEach((permission) => {
      const fullKey = `${group.key}.${permission.key}`
      next[fullKey] = Boolean(sourcePermissions?.[fullKey])
    })
  })
  return next
}

const countEnabledPermissions = (permissions = {}) => (
  Object.values(permissions).filter(Boolean).length
)

const buildInitialFormState = (catalog = {}, userType = null) => ({
  name: userType?.name || '',
  description: userType?.description || '',
  status: userType?.status || 'draft',
  defaultLandingPage: userType?.defaultLandingPage || '/dashboard',
  enableEmailAccess: Boolean(userType?.enableEmailAccess),
  copyFromUserTypeId: userType?.copyFromUserTypeId || '',
  hierarchyLevel: String(userType?.hierarchyLevel || catalog?.hierarchyOptions?.[0]?.value || 1),
  parentUserTypeId: userType?.parentUserTypeId || '',
  permissions: createPermissionState(catalog.groups || [], userType?.permissions || {}),
})

const flattenPermissions = (groups = [], permissions = {}) => (
  groups.flatMap((group) => (
    (group.permissions || []).map((permission) => ({
      key: `${group.key}.${permission.key}`,
      enabled: Boolean(permissions[`${group.key}.${permission.key}`]),
    }))
  ))
)

const collectDependencyChain = (key, permissionLookup, visited = new Set()) => {
  if (visited.has(key)) return visited
  visited.add(key)
  const permission = permissionLookup[key]
  ;(permission?.dependencies || []).forEach((dependencyKey) => {
    collectDependencyChain(dependencyKey, permissionLookup, visited)
  })
  return visited
}

const collectDependentChain = (key, dependentsLookup, visited = new Set()) => {
  if (visited.has(key)) return visited
  visited.add(key)
  ;(dependentsLookup[key] || []).forEach((dependentKey) => {
    collectDependentChain(dependentKey, dependentsLookup, visited)
  })
  return visited
}

const ManageUserTypesModule = ({ onBack, addNotification, onUserTypesSync }) => {
  const { socket } = useAuth()
  const [catalog, setCatalog] = useState({ groups: [], statuses: [], landingPages: [], hierarchyOptions: [] })
  const [userTypes, setUserTypes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editorMode, setEditorMode] = useState('view')
  const [expandedSections, setExpandedSections] = useState({})
  const [formState, setFormState] = useState(buildInitialFormState())
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const permissionLookup = useMemo(
    () => buildPermissionLookup(catalog.groups || []),
    [catalog.groups]
  )
  const dependentLookup = useMemo(
    () => buildDependentsLookup(permissionLookup),
    [permissionLookup]
  )

  const syncUserTypeOptions = (items) => {
    if (!onUserTypesSync) return
    onUserTypesSync(
      (items || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
      }))
    )
  }

  const loadModule = async () => {
    setLoading(true)
    setError('')
    try {
      const [types, permissions] = await Promise.all([
        userTypeApi.list(),
        userTypeApi.getPermissions(),
      ])

      setCatalog(permissions || { groups: [], statuses: [], landingPages: [], hierarchyOptions: [] })
      setUserTypes(types || [])
      syncUserTypeOptions(types || [])

      const defaultExpanded = (permissions?.groups || []).reduce((accumulator, group) => ({
        ...accumulator,
        [group.key]: true,
      }), {})
      setExpandedSections(defaultExpanded)

      startTransition(() => {
        setSelectedId((current) => {
          if (current && (types || []).some((item) => item.id === current)) return current
          return types?.[0]?.id || null
        })
      })
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load user types.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModule()
  }, [])

  useEffect(() => {
    if (!socket) return undefined
    const handleMutation = () => {
      loadModule()
    }

    socket.on(SOCKET_EVENTS.USER_TYPE_CREATED, handleMutation)
    socket.on(SOCKET_EVENTS.USER_TYPE_UPDATED, handleMutation)
    socket.on(SOCKET_EVENTS.USER_TYPE_DELETED, handleMutation)

    return () => {
      socket.off(SOCKET_EVENTS.USER_TYPE_CREATED, handleMutation)
      socket.off(SOCKET_EVENTS.USER_TYPE_UPDATED, handleMutation)
      socket.off(SOCKET_EVENTS.USER_TYPE_DELETED, handleMutation)
    }
  }, [socket])

  const filteredUserTypes = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase()
    if (!query) return userTypes
    return userTypes.filter((item) => (
      String(item.name || '').toLowerCase().includes(query)
      || String(item.description || '').toLowerCase().includes(query)
    ))
  }, [deferredSearchTerm, userTypes])

  const selectedUserType = useMemo(
    () => userTypes.find((item) => item.id === selectedId) || null,
    [selectedId, userTypes]
  )

  const enterCreateMode = () => {
    setEditorMode('create')
    setFormState(buildInitialFormState(catalog))
    setError('')
  }

  const enterEditMode = (mode = 'edit') => {
    if (!selectedUserType) return
    setEditorMode(mode)
    setFormState(buildInitialFormState(catalog, {
      ...selectedUserType,
      name: mode === 'clone' ? `${selectedUserType.name} Copy` : selectedUserType.name,
      status: mode === 'clone' ? 'draft' : selectedUserType.status,
      copyFromUserTypeId: selectedUserType.id,
    }))
    setError('')
  }

  const updatePermissionsState = (updater) => {
    setFormState((current) => ({
      ...current,
      permissions: updater(current.permissions),
    }))
  }

  const togglePermission = (fullKey, checked) => {
    updatePermissionsState((currentPermissions) => {
      const next = { ...currentPermissions, [fullKey]: checked }

      if (checked) {
        collectDependencyChain(fullKey, permissionLookup).forEach((dependencyKey) => {
          next[dependencyKey] = true
        })
      } else {
        collectDependentChain(fullKey, dependentLookup).forEach((dependentKey) => {
          next[dependentKey] = false
        })
      }

      return next
    })
  }

  const toggleSection = (groupKey, checked) => {
    const group = catalog.groups.find((entry) => entry.key === groupKey)
    if (!group) return

    let nextPermissions = { ...formState.permissions }
    ;(group.permissions || []).forEach((permission) => {
      const fullKey = `${groupKey}.${permission.key}`
      if (checked) {
        collectDependencyChain(fullKey, permissionLookup).forEach((dependencyKey) => {
          nextPermissions[dependencyKey] = true
        })
      } else {
        collectDependentChain(fullKey, dependentLookup).forEach((dependentKey) => {
          nextPermissions[dependentKey] = false
        })
      }
      nextPermissions[fullKey] = checked
    })

    setFormState((current) => ({
      ...current,
      permissions: nextPermissions,
    }))
  }

  const handleCopyFromRole = (userTypeId) => {
    setFormState((current) => {
      const matched = userTypes.find((item) => item.id === Number(userTypeId))
      if (!matched) {
        return { ...current, copyFromUserTypeId: userTypeId }
      }

      return {
        ...current,
        copyFromUserTypeId: userTypeId,
        enableEmailAccess: Boolean(matched.enableEmailAccess),
        permissions: createPermissionState(catalog.groups || [], matched.permissions || {}),
      }
    })
  }

  const validateForm = (payload) => {
    if (!payload.name.trim()) {
      return 'User Type Name is required.'
    }

    const duplicate = userTypes.find((item) => (
      item.name.toLowerCase() === payload.name.trim().toLowerCase()
      && (editorMode === 'create' || editorMode === 'clone' || item.id !== selectedUserType?.id)
    ))
    if (duplicate) {
      return 'This user type name already exists.'
    }

    return ''
  }

  const buildPayload = (overrides = {}) => ({
    name: formState.name.trim(),
    description: formState.description.trim(),
    status: overrides.status || formState.status,
    defaultLandingPage: formState.defaultLandingPage,
    enableEmailAccess: formState.enableEmailAccess,
    copyFromUserTypeId: formState.copyFromUserTypeId ? Number(formState.copyFromUserTypeId) : null,
    hierarchyLevel: Number(formState.hierarchyLevel),
    parentUserTypeId: formState.parentUserTypeId ? Number(formState.parentUserTypeId) : null,
    isArchived: overrides.isArchived ?? formState.status === 'archived',
    permissions: flattenPermissions(catalog.groups || [], formState.permissions),
  })

  const handleSave = async (overrides = {}) => {
    const payload = buildPayload(overrides)
    const validationMessage = validateForm(payload)
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)
    setError('')
    try {
      const saved = editorMode === 'edit' && selectedUserType
        ? await userTypeApi.update(selectedUserType.id, payload)
        : await userTypeApi.create(payload)

      await loadModule()
      setSelectedId(saved?.id || selectedUserType?.id || null)
      setEditorMode('view')
      addNotification(
        'success',
        overrides.status === 'draft' ? 'Draft saved' : 'User type saved',
        `${saved?.name || payload.name} was saved successfully.`
      )
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save this user type.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUserType) return
    const confirmed = window.confirm(`Delete ${selectedUserType.name}?`)
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      await userTypeApi.remove(selectedUserType.id)
      addNotification('success', 'User type deleted', `${selectedUserType.name} was deleted successfully.`)
      await loadModule()
      setEditorMode('view')
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || 'Unable to delete this user type.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!selectedUserType) return
    setSaving(true)
    setError('')
    try {
      await userTypeApi.update(selectedUserType.id, {
        ...buildPayload({ status: 'archived', isArchived: true }),
        name: selectedUserType.name,
        description: selectedUserType.description,
        defaultLandingPage: selectedUserType.defaultLandingPage,
        enableEmailAccess: selectedUserType.enableEmailAccess,
        copyFromUserTypeId: selectedUserType.copyFromUserTypeId,
        hierarchyLevel: selectedUserType.hierarchyLevel,
        parentUserTypeId: selectedUserType.parentUserTypeId,
        permissions: flattenPermissions(catalog.groups || [], selectedUserType.permissions || {}),
      })
      addNotification('success', 'User type archived', `${selectedUserType.name} was archived successfully.`)
      await loadModule()
    } catch (archiveError) {
      setError(archiveError.response?.data?.message || 'Unable to archive this user type.')
    } finally {
      setSaving(false)
    }
  }

  const previewPermissionCount = countEnabledPermissions(
    editorMode === 'view' ? (selectedUserType?.permissions || {}) : formState.permissions
  )

  return (
    <div className="manage-user-types-page">
      <div className="configure-user-type-header">
        <button type="button" className="configure-user-type-back" onClick={onBack}>
          <FaChevronLeft />
          <span>Configure User Type</span>
        </button>
        <button type="button" className="configure-user-type-add-button" onClick={enterCreateMode}>
          <FaLayerGroup />
          <span>Add User Type</span>
        </button>
      </div>

      {error ? <div className="admin-user-management-error">{error}</div> : null}

      <div className="manage-user-types-layout">
        <aside className="manage-user-types-sidebar">
          <Card
            title={`User Types (${filteredUserTypes.length})`}
            subtitle="Search, review, and open user role configurations."
            className="admin-user-settings-content-card"
          >
            <div className="manage-user-types-search">
              <FaSearch className="manage-user-types-search-icon" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search User Type"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="manage-user-types-list-meta">
              <span>Active User Count is shown for each role.</span>
              <Button onClick={enterCreateMode}>
                <FaPlus /> Add User Type
              </Button>
            </div>

            {loading ? (
              <div className="manage-user-types-empty">Loading user types...</div>
            ) : filteredUserTypes.length === 0 ? (
              <div className="manage-user-types-empty">No user types found.</div>
            ) : (
              <ul className="manage-user-types-list">
                {filteredUserTypes.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`manage-user-types-list-item ${selectedId === item.id ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedId(item.id)
                        if (editorMode === 'create' || editorMode === 'clone' || editorMode === 'edit') {
                          setEditorMode('view')
                        }
                      }}
                    >
                      <span className="manage-user-types-list-icon">
                        <FaShieldAlt />
                      </span>
                      <span className="manage-user-types-list-copy">
                        <strong>{item.name}</strong>
                        <small>{item.description || 'No description provided.'}</small>
                      </span>
                      <span className="manage-user-types-list-count">
                        <span>Active User Count</span>
                        <strong>{item.activeUserCount || 0}</strong>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>

        <section className="manage-user-types-main">
          <Card
            title={editorMode === 'view'
              ? (selectedUserType?.name || 'Manage User Type')
              : (editorMode === 'edit' ? 'Edit User Type' : editorMode === 'clone' ? 'Clone User Type' : 'Add User Type')}
            subtitle={editorMode === 'view'
              ? 'Display selected role permissions and user access preview.'
              : 'Create or update the role, access flags, landing page, and detailed permissions.'}
            className="admin-user-settings-content-card"
          >
            <div className="manage-user-types-actions">
              <Button variant="outline" onClick={enterCreateMode}>
                <FaPlus /> Add
              </Button>
              <Button variant="outline" onClick={() => enterEditMode('edit')} disabled={!selectedUserType}>
                <FaEdit /> Edit
              </Button>
              <Button variant="outline" onClick={() => enterEditMode('clone')} disabled={!selectedUserType}>
                <FaClone /> Clone
              </Button>
              <Button variant="outline" onClick={handleArchive} disabled={!selectedUserType || saving}>
                <FaArchive /> Archive
              </Button>
              <Button variant="outline" onClick={() => setEditorMode('view')} disabled={!selectedUserType}>
                <FaEye /> View
              </Button>
              <Button variant="outline" onClick={handleDelete} disabled={!selectedUserType || saving}>
                <FaTrash /> Delete
              </Button>
            </div>

            {!selectedUserType && editorMode === 'view' ? (
              <div className="manage-user-types-empty">Select the User Type to manage.</div>
            ) : editorMode === 'view' && selectedUserType ? (
              <div className="manage-user-types-preview manage-user-types-preview-shell">
                <div className="manage-user-types-landscape-rail">
                <div className="manage-user-types-preview-grid">
                  <div className="manage-user-types-preview-stat">
                    <span>Status</span>
                    <strong>{selectedUserType.status}</strong>
                  </div>
                  <div className="manage-user-types-preview-stat">
                    <span>Default Landing Page</span>
                    <strong>{selectedUserType.defaultLandingPage}</strong>
                  </div>
                  <div className="manage-user-types-preview-stat">
                    <span>Enabled Permissions</span>
                    <strong>{countEnabledPermissions(selectedUserType.permissions || {})}</strong>
                  </div>
                  <div className="manage-user-types-preview-stat">
                    <span>Active User Count</span>
                    <strong>{selectedUserType.activeUserCount || 0}</strong>
                  </div>
                </div>

                <div className="manage-user-types-preview-meta">
                  <Badge variant={selectedUserType.enableEmailAccess ? 'success' : 'default'}>
                    {selectedUserType.enableEmailAccess ? 'Email Access Enabled' : 'Email Access Disabled'}
                  </Badge>
                  <Badge variant="info">Hierarchy Level {selectedUserType.hierarchyLevel}</Badge>
                  {selectedUserType.isArchived ? <Badge variant="warning">Archived</Badge> : null}
                </div>

                <div className="manage-user-types-audit-note">
                  <FaCheckCircle aria-hidden="true" />
                  <span>Audit logs are recorded for create, edit, clone, archive, and delete actions.</span>
                </div>

                <div className="manage-user-types-timestamps">
                  <div>
                    <span>Created</span>
                    <strong>{formatDate(selectedUserType.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Updated</span>
                    <strong>{formatDate(selectedUserType.updatedAt)}</strong>
                  </div>
                  <div>
                    <span>Permissions Updated</span>
                    <strong>{formatDate(selectedUserType.permissionsUpdatedAt)}</strong>
                  </div>
                </div>
                </div>

                <div className="manage-user-types-landscape-content">
                  <div className="manage-user-types-sections manage-user-types-sections-two-column">
                  {(catalog.groups || []).map((group) => {
                    const enabledCount = (group.permissions || []).filter((permission) => (
                      selectedUserType.permissions?.[`${group.key}.${permission.key}`]
                    )).length

                    return (
                      <section key={group.key} className="manage-user-type-section">
                        <div className="manage-user-type-section-head">
                          <div>
                            <h3>{group.label}</h3>
                            <p>{group.description || group.dbGroup?.description || 'Permission access section.'}</p>
                          </div>
                          <Badge variant={enabledCount ? 'success' : 'default'}>
                            {enabledCount}/{group.permissions?.length || 0} enabled
                          </Badge>
                        </div>

                        <div className="manage-user-type-permission-grid is-preview">
                          {(group.permissions || []).map((permission) => {
                            const fullKey = `${group.key}.${permission.key}`
                            const isEnabled = Boolean(selectedUserType.permissions?.[fullKey])
                            return (
                              <label
                                key={fullKey}
                                className={`manage-user-type-permission-item ${isEnabled ? 'is-enabled' : ''}`}
                              >
                                <input type="checkbox" checked={isEnabled} readOnly />
                                <span>{permission.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="manage-user-types-editor manage-user-types-editor-shell">
                <div className="manage-user-types-editor-rail">
                <div className="manage-user-types-editor-grid">
                  <Input
                    label="User Type Name *"
                    value={formState.name}
                    onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                    fullWidth
                  />

                  <label className="manage-user-types-field">
                    <span>Status</span>
                    <select
                      value={formState.status}
                      onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
                    >
                      {(catalog.statuses || []).map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>

                  <label className="manage-user-types-field manage-user-types-field-wide">
                    <span>Description</span>
                    <textarea
                      rows="4"
                      value={formState.description}
                      onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Describe the role purpose and permission scope"
                    />
                  </label>

                  <label className="manage-user-types-field">
                    <span>Default Landing Page</span>
                    <select
                      value={formState.defaultLandingPage}
                      onChange={(event) => setFormState((current) => ({ ...current, defaultLandingPage: event.target.value }))}
                    >
                      {(catalog.landingPages || []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="manage-user-types-field">
                    <span>Role Hierarchy</span>
                    <select
                      value={formState.hierarchyLevel}
                      onChange={(event) => setFormState((current) => ({ ...current, hierarchyLevel: event.target.value }))}
                    >
                      {(catalog.hierarchyOptions || []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="manage-user-types-field">
                    <span>Copy Permission From Existing Role</span>
                    <select
                      value={formState.copyFromUserTypeId}
                      onChange={(event) => handleCopyFromRole(event.target.value)}
                    >
                      <option value="">Select existing role</option>
                      {userTypes.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="manage-user-types-field">
                    <span>Parent Role</span>
                    <select
                      value={formState.parentUserTypeId}
                      onChange={(event) => setFormState((current) => ({ ...current, parentUserTypeId: event.target.value }))}
                    >
                      <option value="">No parent role</option>
                      {userTypes
                        .filter((item) => item.id !== selectedUserType?.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                  </label>

                  <label className="manage-user-types-toggle">
                    <input
                      type="checkbox"
                      checked={formState.enableEmailAccess}
                      onChange={(event) => setFormState((current) => ({ ...current, enableEmailAccess: event.target.checked }))}
                    />
                    <span>Enable Email Access</span>
                  </label>
                </div>

                <div className="manage-user-types-preview-strip">
                  <div>
                    <span>Role Preview</span>
                    <strong>{previewPermissionCount} permissions enabled</strong>
                  </div>
                  <div>
                    <span>Landing Page</span>
                    <strong>{formState.defaultLandingPage}</strong>
                  </div>
                  <div>
                    <span>Email Module</span>
                    <strong>{formState.enableEmailAccess ? 'Enabled' : 'Disabled'}</strong>
                  </div>
                </div>
                </div>

                <div className="manage-user-types-editor-content">
                  <div className="manage-user-types-sections manage-user-types-sections-two-column">
                  {(catalog.groups || []).map((group) => {
                    const sectionKeys = (group.permissions || []).map((permission) => `${group.key}.${permission.key}`)
                    const sectionEnabledCount = sectionKeys.filter((key) => formState.permissions[key]).length
                    const allSelected = sectionKeys.length > 0 && sectionEnabledCount === sectionKeys.length

                    return (
                      <section key={group.key} className="manage-user-type-section">
                        <div className="manage-user-type-section-head">
                          <button
                            type="button"
                            className="manage-user-type-section-toggle"
                            onClick={() => setExpandedSections((current) => ({ ...current, [group.key]: !current[group.key] }))}
                          >
                            {expandedSections[group.key] ? <FaChevronDown /> : <FaChevronRight />}
                            <div>
                              <h3>{group.label}</h3>
                              <p>{group.description || group.dbGroup?.description || 'Permission access section.'}</p>
                            </div>
                          </button>

                          <label className="manage-user-type-section-select-all">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(event) => toggleSection(group.key, event.target.checked)}
                            />
                            <span>Select All</span>
                          </label>
                        </div>

                        {expandedSections[group.key] ? (
                          <div className="manage-user-type-permission-grid">
                            {(group.permissions || []).map((permission) => {
                              const fullKey = `${group.key}.${permission.key}`
                              const dependencyLabels = (permission.dependencies || []).map(
                                (dependencyKey) => permissionLookup[dependencyKey]?.label || dependencyKey
                              )

                              return (
                                <label
                                  key={fullKey}
                                  className={`manage-user-type-permission-item ${formState.permissions[fullKey] ? 'is-enabled' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(formState.permissions[fullKey])}
                                    onChange={(event) => togglePermission(fullKey, event.target.checked)}
                                  />
                                  <span>{permission.label}</span>
                                  {dependencyLabels.length ? (
                                    <small>Depends on: {dependencyLabels.join(', ')}</small>
                                  ) : null}
                                </label>
                              )
                            })}
                          </div>
                        ) : null}
                      </section>
                    )
                  })}
                  </div>
                </div>

                <div className="manage-user-types-editor-actions">
                  <Button variant="outline" onClick={() => setEditorMode('view')} disabled={saving}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={() => handleSave({ status: 'draft' })} disabled={saving}>
                    Save Draft
                  </Button>
                  <Button onClick={() => handleSave()} disabled={saving}>
                    {saving ? 'Saving...' : 'Save User Type'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}

export default ManageUserTypesModule
