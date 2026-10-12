import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import OutlookEmailComposerModal from '../../components/integrations/OutlookEmailComposerModal'

const OutlookEmailComposePage = () => {
  const navigate = useNavigate()
  const { targetType = 'account', targetId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || ''

  const handleClose = () => {
    if (returnTo) {
      navigate(returnTo)
      return
    }
    navigate(-1)
  }

  return (
    <OutlookEmailComposerModal
      isOpen
      pageMode
      onClose={handleClose}
      recipientEmail={searchParams.get('to') || ''}
      targetType={targetType}
      targetId={targetId}
      defaultSubject={searchParams.get('subject') || 'CRM Message'}
      defaultMessage={searchParams.get('message') || ''}
      onSuccess={handleClose}
    />
  )
}

export default OutlookEmailComposePage
