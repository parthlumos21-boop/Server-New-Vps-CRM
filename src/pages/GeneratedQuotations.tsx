import { useNavigate } from 'react-router-dom'
import { quotationService } from '../services/quotationService'

export function useQuotationActionHandlers() {
  const navigate = useNavigate()

  const handlePreview = (id: string) => {
    navigate(`/quotations/${id}/preview`)
  }

  const handleViewPdf = (id: string) => {
    window.open(`/api/quotations/${id}/pdf`)
  }

  const handleApproveQuote = async (id: string) => {
    await quotationService.approve(id)
  }

  const handleRejectQuote = async (id: string) => {
    await quotationService.reject(id)
  }

  const handleCloneQuote = async (id: string) => {
    await quotationService.clone(id)
  }

  const handleViewAccount = (accountId: string) => {
    navigate(`/accounts/${accountId}`)
  }

  return {
    handlePreview,
    handleViewPdf,
    handleApproveQuote,
    handleRejectQuote,
    handleCloneQuote,
    handleViewAccount,
  }
}

export default function GeneratedQuotations() {
  return null
}