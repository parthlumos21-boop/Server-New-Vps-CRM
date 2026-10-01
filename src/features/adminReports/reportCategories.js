export const REPORT_CATEGORIES = [
  { key: 'account', label: 'Account', emptyMessage: 'No account reports available.' },
  { key: 'customer', label: 'Customer', emptyMessage: 'No customer reports available.' },
  { key: 'sr', label: 'SR', emptyMessage: 'No support request reports available.' },
  { key: 'closed_sr', label: 'Closed SR', emptyMessage: 'No closed support request reports available.' },
  { key: 'deal', label: 'Deal', emptyMessage: 'No deal reports available.' },
  { key: 'quotation', label: 'Quotation', emptyMessage: 'No quotation reports available.' },
  { key: 'geo_tracking', label: 'Geo Tracking', emptyMessage: 'No geo tracking reports available.' },
  { key: 'remark', label: 'Remark', emptyMessage: 'No remark reports available.' },
  { key: 'daily_status', label: 'Daily Status', emptyMessage: 'No daily status reports available.' },
]

export const getReportCategoryByKey = (categoryKey = '') =>
  REPORT_CATEGORIES.find((category) => category.key === categoryKey) || REPORT_CATEGORIES[0]
