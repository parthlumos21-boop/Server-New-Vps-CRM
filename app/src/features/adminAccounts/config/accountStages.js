export const ACCOUNT_STAGES = [
  { key: 'new', label: 'New', order: 1, visible: true, emptyStateText: 'No new accounts are waiting in this stage.' },
  { key: 'follow_up', label: 'Follow Up', order: 2, visible: true, emptyStateText: 'No follow-up accounts are available right now.' },
  { key: 'technical_offer', label: 'Technical Offer', order: 3, visible: true, emptyStateText: 'No technical offers are pending review.' },
  { key: 'priority_1', label: 'Priority 1', order: 4, visible: true, emptyStateText: 'No accounts are tagged as Priority 1.' },
  { key: 'commercial_offer', label: 'Commercial Offer', order: 5, visible: true, emptyStateText: 'No commercial offers are in progress.' },
  { key: 'priority_2', label: 'Priority 2', order: 6, visible: true, emptyStateText: 'No accounts are tagged as Priority 2.' },
  { key: 'quotation_sent', label: 'Quotation Sent', order: 7, visible: true, emptyStateText: 'No quotations have been sent in this bucket.' },
  { key: 'quote_revision', label: 'Quote Revision', order: 8, visible: true, emptyStateText: 'No quote revisions are pending.' },
  { key: 'order_received', label: 'Order Received', order: 9, visible: true, emptyStateText: 'No orders have been received yet.' },
  { key: 'convert_to_po', label: 'Convert To PO', order: 10, visible: true, emptyStateText: 'No accounts are waiting to be converted to PO.' },
  { key: 'order_lost', label: 'Order Lost', order: 11, visible: true, emptyStateText: 'No lost-order accounts are listed here.' },
  { key: 'converted', label: 'Converted', order: 12, visible: true, emptyStateText: 'No converted accounts are available yet.' },
  { key: 'rejected', label: 'Rejected', order: 13, visible: true, emptyStateText: 'No rejected accounts are currently listed.' },
  { key: 'contacted', label: 'Contracted', order: 14, visible: true, emptyStateText: 'No contracted accounts are in this stage.' },
  { key: 'closed', label: 'Closed', order: 15, visible: true, emptyStateText: 'No closed accounts are available in this stage.' },
]

export const ACCOUNT_CHANGE_STATUS_OPTIONS = [
  { value: 'new', label: 'New', stageKey: 'new' },
  { value: 'follow_up', label: 'Follow Up', stageKey: 'follow_up' },
  { value: 'technical_offer', label: 'Technical Offer', stageKey: 'technical_offer' },
  { value: 'priority_1', label: 'Priority 1', stageKey: 'priority_1' },
  { value: 'commercial_offer', label: 'Commercial Offer', stageKey: 'commercial_offer' },
  { value: 'priority_2', label: 'Priority 2', stageKey: 'priority_2' },
  { value: 'quotation_sent', label: 'Quotation Sent', stageKey: 'quotation_sent', aliases: ['quote sent'] },
  { value: 'quote_revision', label: 'Quote Revision', stageKey: 'quote_revision' },
  { value: 'order_received', label: 'Order Received', stageKey: 'order_received' },
  { value: 'convert_to_po', label: 'Convert To PO', stageKey: 'convert_to_po', aliases: ['po converted'] },
  { value: 'order_lost', label: 'Order Lost', stageKey: 'order_lost', aliases: ['lost'] },
  { value: 'converted', label: 'Converted', stageKey: 'converted' },
  { value: 'rejected', label: 'Rejected', stageKey: 'rejected', aliases: ['rejected'] },
  { value: 'contacted', label: 'Contracted', stageKey: 'contacted' },
  { value: 'closed', label: 'Closed', stageKey: 'closed' },
]

export const ACCOUNT_PO_STAGE_KEY = 'convert_to_po'

export const ACCOUNT_ORDER_STATUS_OPTIONS = ['OLD', 'NEW']

export const ACCOUNT_QUOTATION_STATUS_OPTIONS = ['Pending', 'Sent', 'Revised', 'Won', 'Lost']

export const ACCOUNT_STATE_OPTIONS = ['Hot', 'Warm', 'Cold', 'Active', 'Inactive', 'Hold', 'Pending']

export const DEFAULT_ACCOUNT_STAGE = ACCOUNT_STAGES.find((stage) => stage.visible)?.key || 'new'

export const getVisibleAccountStages = () =>
  ACCOUNT_STAGES
    .filter((stage) => stage.visible)
    .sort((left, right) => left.order - right.order)

export const getAccountChangeStatusOption = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()

  return ACCOUNT_CHANGE_STATUS_OPTIONS.find((option) => (
    option.value === value
    || option.stageKey === value
    || option.label.trim().toLowerCase() === normalizedValue
    || option.stageKey.replace(/_/g, ' ') === normalizedValue
    || option.aliases?.some((alias) => String(alias).trim().toLowerCase() === normalizedValue)
  )) || ACCOUNT_CHANGE_STATUS_OPTIONS[0]
}

export const shouldShowAccountPoDetails = (value) =>
  getAccountChangeStatusOption(value)?.stageKey === ACCOUNT_PO_STAGE_KEY
