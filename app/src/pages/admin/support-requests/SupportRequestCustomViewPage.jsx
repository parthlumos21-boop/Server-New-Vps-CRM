import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_DEFINITIONS, getSupportRequestCustomViewClassificationLabel } from '../../../features/adminSupportRequests/customViews/supportRequestCustomViewConfig'
import { getCustomViewSupportRequests } from '../../../features/adminSupportRequests/customViews/getCustomViewSupportRequests'
import { ADMIN_SUPPORT_REQUEST_CUSTOM_VIEW_NEW_ROUTE, getAdminSupportRequestCustomViewById, subscribeAdminSupportRequestCustomViews } from '../../../features/adminSupportRequests/customViews/supportRequestCustomViewStorage'
import SupportRequestBoard from './SupportRequestBoard'
import SupportRequestCustomViewTable from './SupportRequestCustomViewTable'
import './SupportRequestAdmin.css'

const SupportRequestCustomViewPage = () => {
  const navigate = useNavigate()
  const { viewId } = useParams()
  const { supportRequests } = useData()
  const { user } = useAuth()
  const [customView, setCustomView] = useState(() => getAdminSupportRequestCustomViewById(viewId))

  useEffect(() => {
    setCustomView(getAdminSupportRequestCustomViewById(viewId))
    return subscribeAdminSupportRequestCustomViews((views) => {
      setCustomView(views.find((view) => view.id === String(viewId || '')) || null)
    })
  }, [viewId])

  const filteredSupportRequests = useMemo(
    () => getCustomViewSupportRequests(supportRequests, user, customView || {}),
    [customView, supportRequests, user]
  )

  if (!customView) {
    return (
      <div className="support-request-admin-page">
        <section className="support-request-admin-card">
          <h1>Support Request Custom View Not Found</h1>
          <p>The requested support-request custom view may have been removed or not created yet.</p>
          <div className="support-request-admin-actions">
            <Button onClick={() => navigate(ADMIN_SUPPORT_REQUEST_CUSTOM_VIEW_NEW_ROUTE)}>
              Create Custom View
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/support-requests/view')}>
              Back To SR View
            </Button>
          </div>
        </section>
      </div>
    )
  }

  if (customView.viewType === 'grid') {
    return (
      <SupportRequestBoard
        title={`${customView.name} (${getSupportRequestCustomViewClassificationLabel(customView.classification)})`}
        supportRequests={filteredSupportRequests}
        visibleFieldKeys={customView.visibleFields}
        fieldDefinitions={SUPPORT_REQUEST_CUSTOM_VIEW_FIELD_DEFINITIONS}
      />
    )
  }

  return (
    <SupportRequestCustomViewTable
      title={`${customView.name} (${getSupportRequestCustomViewClassificationLabel(customView.classification)})`}
      supportRequests={filteredSupportRequests}
      visibleFields={customView.visibleFields}
    />
  )
}

export default SupportRequestCustomViewPage
