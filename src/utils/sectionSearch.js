export const normalizeSectionSearchValue = (value) => (
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
)

const SEARCH_FIELD_ALIASES = {
  accountNumber: ['accountNumber', 'accountNo', 'account_number', 'ownerCode', 'id'],
  accountNo: ['accountNo', 'accountNumber', 'account_number', 'ownerCode', 'id'],
  accountName: ['accountName', 'name', 'customerName', 'companyName'],
  name: ['name', 'accountName', 'customerName', 'companyName'],
  projectName: ['projectName', 'project', 'project_name', 'productCategory'],
  accountOwner: ['accountOwner', 'accountOwnerDisplay', 'accountOwnerName', 'ownerName', 'assignedToName', 'owner'],
  dealOwner: ['dealOwner', 'dealOwnerDisplay', 'dealOwnerName', 'ownerName', 'owner'],
  customerOwner: ['customerOwner', 'customerOwnerDisplay', 'customerOwnerName', 'ownerName', 'owner'],
  quotationOwner: ['quotationOwner', 'quotationOwnerDisplay', 'quotationOwnerName', 'ownerName', 'owner'],
  ownerName: ['ownerName', 'owner', 'assignedToName', 'accountOwner', 'dealOwner', 'customerOwner'],
  accountDate: ['accountDate', 'account_date', 'accountDateDisplay', 'createdAt', 'addedDate'],
  dealDate: ['dealDate', 'deal_date', 'dealDateDisplay', 'createdAt'],
  quotationDate: ['quotationDate', 'quotation_date', 'date', 'createdAt'],
  addedDate: ['addedDate', 'addedOn', 'createdAt'],
  serviceDate: ['serviceDate', 'srDate', 'requestDate', 'service_date', 'createdAt'],
  lastUpdated: ['lastUpdated', 'updatedAt', 'updatedAtDisplay'],
  accountStatus: ['accountStatus', 'status'],
  dealStatus: ['dealStatus', 'status', 'stage'],
  customerStatus: ['customerStatus', 'status'],
  status: ['status', 'accountStatus', 'dealStatus', 'customerStatus'],
  accountCategory: ['accountCategory', 'category'],
  accountState: ['accountState', 'state'],
  customerCategory: ['customerCategory', 'category'],
  customerType: ['customerType', 'type'],
  dealType: ['dealType', 'type'],
  convertToPo: ['convertToPo', 'convertPO', 'convert_to_po', 'convertToPO'],
  poValue: ['poValue', 'po_value'],
  dealValue: ['dealValue', 'deal_value', 'value'],
  lostOrderReason: ['lostOrderReason', 'reasonForLostOrder', 'reasonForLost', 'lost_order_reason'],
  reasonForLostOrder: ['reasonForLostOrder', 'lostOrderReason', 'reasonForLost', 'lost_order_reason'],
  quotationNumber: ['quotationNumber', 'quotationNo', 'num', 'number'],
  companyName: ['companyName', 'company', 'clientName', 'customerName'],
  amount: ['amount', 'amountLabel', 'totalAmount', 'total_amount'],
  srNumber: ['srNumber', 'srNo', 'sr_number'],
  requestType: ['requestType', 'serviceType', 'type'],
  customerNumber: ['customerNumber', 'customerNo', 'customer_number'],
  latestRemark: ['latestRemark', 'remark', 'remarks'],
}

const getNestedValue = (record, path) => String(path).split('.').reduce((value, key) => value?.[key], record)

export const getSectionSearchValues = (record = {}, field) => {
  if (typeof field === 'function') return [field(record)]

  const keys = Array.isArray(field)
    ? field
    : (SEARCH_FIELD_ALIASES[field] || [field])

  const sources = [record, record?.raw, record?.formData, record?.raw?.formData]
  return sources.flatMap((source) => keys.map((key) => getNestedValue(source, key)))
}

export const matchesSectionSearch = (record, fields, query) => {
  const normalizedQuery = normalizeSectionSearchValue(query)
  if (!normalizedQuery) return true

  return fields.some((field) => {
    return getSectionSearchValues(record, field)
      .some((value) => normalizeSectionSearchValue(value).includes(normalizedQuery))
  })
}
