import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import { getAdminDealCustomViewById, subscribeAdminDealCustomViews } from '../../../features/adminDeals/customViews/dealCustomViewStorage'
import Deals from '../../deals/Deals'
import '../../deals/Deals.css'

const AdminDealCustomViewPage = () => {
  const navigate = useNavigate()
  const { viewId } = useParams()
  const [customView, setCustomView] = useState(() => getAdminDealCustomViewById(viewId))

  useEffect(() => {
    setCustomView(getAdminDealCustomViewById(viewId))
    return subscribeAdminDealCustomViews((views) => {
      setCustomView(views.find((view) => view.id === String(viewId || '')) || null)
    })
  }, [viewId])

  if (!customView) {
    return (
      <div className="deals-page">
        <Card
          title="Custom Deal View Not Found"
          subtitle="The requested deal custom view may have been removed or not created yet."
          actions={(
            <Button onClick={() => navigate('/admin/deals/custom-views/new')}>
              Create Custom View
            </Button>
          )}
        >
          <Button variant="outline" onClick={() => navigate('/admin/deals/view')}>
            Back To View Deals
          </Button>
        </Card>
      </div>
    )
  }

  return <Deals isAdmin variantKey={customView.baseViewKey} customViewDefinition={customView} />
}

export default AdminDealCustomViewPage
