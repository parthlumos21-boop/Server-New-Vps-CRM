const field = (key, label, group = 'Details') => ({ key, label, group })

const commonAuditFields = [
  field('addedBy', 'Added By', 'Audit'),
  field('createdBy', 'Created By', 'Audit'),
  field('createdAt', 'Added On', 'Audit'),
  field('updatedAt', 'Last Updated', 'Audit'),
  field('userType', 'User Type', 'Audit'),
  field('userGroup', 'User Group', 'Audit'),
]

const remarkFields = [
  field('remarkAddedBy', 'Remark Added By', 'Remark Attributes'),
  field('remarkAddedOn', 'Remark Added On', 'Remark Attributes'),
  field('remarkType', 'Remark Type', 'Remark Attributes'),
  field('remarkNote', 'Remark Note', 'Remark Attributes'),
]

const customerFields = [
  field('customerNumber', 'Customer No.', 'Customer'),
  field('customerName', 'Customer Name', 'Customer'),
  field('addedDate', 'Added Date', 'Customer'),
  field('customerCategory', 'Customer Category', 'Customer'),
  field('customerOwner', 'Customer Owner', 'Customer'),
  field('customerStatus', 'Customer Status', 'Customer'),
  field('contactPerson', 'Contact Person', 'Customer'),
  field('email', 'Email', 'Customer'),
  field('phone', 'Phone', 'Customer'),
  field('address', 'Address', 'Customer'),
  field('customerType', 'Customer Type', 'Customer'),
  field('productCategory', 'Product Category', 'Customer'),
  field('designation', 'Designation', 'Customer'),
  field('projectName', 'Project Name', 'Customer'),
  field('state', 'State', 'Customer'),
  field('industryType', 'Industry Type', 'Customer'),
  field('gstin', 'GSTIN', 'Customer'),
  field('stateCode', 'State Code', 'Customer'),
  field('alternateEmail', 'Alternate Email', 'Customer'),
  field('alternatePhone', 'Alternate Phone', 'Customer'),
  field('jobNo', 'Job No', 'Customer'),
  field('lastUpdated', 'Last Updated', 'Customer'),
  field('addedBy', 'Added By', 'Customer'),
  field('userType', 'User Type', 'Customer'),
  field('userGroup', 'User Group', 'Customer'),
]

const dealFields = [
  field('dealNumber', 'Deal No.', 'Deal'),
  field('dealDate', 'Deal Date', 'Deal'),
  field('dealType', 'Deal Type', 'Deal'),
  field('dealName', 'Deal Name', 'Deal'),
  field('dealOwner', 'Deal Owner', 'Deal'),
  field('dealStatus', 'Deal Status', 'Deal'),
  field('dealValue', 'Deal Value', 'Deal'),
  field('probability', 'Probability', 'Deal'),
  field('dealSource', 'Deal Source', 'Deal'),
  field('description', 'Description', 'Deal'),
  field('expectedClosureDate', 'Expected Closure Date', 'Deal'),
  field('poValue', 'PO Value', 'Deal'),
  field('currency', 'Currency', 'Deal'),
  field('customerReferenceNo', 'Customer Reference No', 'Deal'),
  field('reasonForLost', 'Reason For Lost', 'Deal'),
  field('addedBy', 'Added By', 'Deal'),
  field('addedOn', 'Added On', 'Deal'),
  field('userType', 'User Type', 'Deal'),
  field('userGroup', 'User Group', 'Deal'),
]

const supportRequestFields = [
  field('customerName', 'Customer Name', 'SR'),
  field('customerNumber', 'Customer No.', 'SR'),
  field('srNumber', 'SR Number', 'SR'),
  field('requestDate', 'Request Date', 'SR'),
  field('requestType', 'Request Type', 'SR'),
  field('owner', 'Owner', 'SR'),
  field('status', 'Status', 'SR'),
  field('endDate', 'End Date', 'SR'),
  field('description', 'Description', 'SR'),
  field('materialList', 'Material List', 'SR'),
  field('totalVisitGiven', 'Total Visit Given', 'SR'),
  field('underWarranty', 'Under Warranty', 'SR'),
  field('contactEmail', 'Contact Email', 'SR'),
  field('phone', 'Phone', 'SR'),
  field('sitePerson', 'Site Person', 'SR'),
  field('address', 'Address', 'SR'),
  field('contactPerson', 'Contact Person', 'SR'),
  field('countryCode', 'Country Code', 'SR'),
  field('email', 'Email', 'SR'),
  field('attendingRequirements', 'Attending Requirements', 'SR'),
  field('onSiteRequirements', 'OnSite Requirements', 'SR'),
  field('onHoldReason', 'On Hold Reason', 'SR'),
  field('postponedReason', 'Postponed Reason', 'SR'),
  field('lastUpdated', 'Last Updated', 'SR'),
  field('reOpenedOn', 'Re-Opened On', 'SR'),
  field('closedOn', 'Closed On', 'SR'),
  field('addedBy', 'Added By', 'SR'),
  field('addedOn', 'Added On', 'SR'),
  field('userType', 'User Type', 'SR'),
  field('userGroup', 'User Group', 'SR'),
]

const accountFields = [
  field('accountNumber', 'Account No.', 'Account'),
  field('accountName', 'Account Name', 'Account'),
  field('accountDate', 'Account Date', 'Account'),
  field('accountCategory', 'Account Category', 'Account'),
  field('accountOwner', 'Account Owner', 'Account'),
  field('accountStatus', 'Account Status', 'Account'),
  field('accountSource', 'Account Source', 'Account'),
  field('contactPerson', 'Contact Person', 'Account'),
  field('phone', 'Phone', 'Account'),
  field('email', 'Email', 'Account'),
  field('projectName', 'Project Name', 'Account'),
  field('location', 'Location', 'Account'),
  field('reasonForLost', 'Reason For Lost', 'Account'),
  ...remarkFields,
  ...commonAuditFields,
]

const quotationFields = [
  field('quotationNumber', 'Quotation No.', 'Quotation'),
  field('quotationDate', 'Quotation Date', 'Quotation'),
  field('quotationStatus', 'Quotation Status', 'Quotation'),
  field('customerName', 'Customer Name', 'Quotation'),
  field('dealName', 'Deal Name', 'Quotation'),
  field('projectName', 'Project Name', 'Quotation'),
  field('amount', 'Amount', 'Quotation'),
  field('currency', 'Currency', 'Quotation'),
  field('revision', 'Revision', 'Quotation'),
  field('owner', 'Owner', 'Quotation'),
  ...commonAuditFields,
]

const projectFields = [
  field('projectNumber', 'Project Number', 'Project'),
  field('projectName', 'Project Name', 'Project'),
  field('customerName', 'Customer Name', 'Project'),
  field('accountName', 'Account Name', 'Project'),
  field('location', 'Location', 'Project'),
  field('state', 'State', 'Project'),
  field('status', 'Status', 'Project'),
  field('owner', 'Owner', 'Project'),
  field('startDate', 'Start Date', 'Project'),
  field('endDate', 'End Date', 'Project'),
  ...commonAuditFields,
]

const taskFields = [
  field('title', 'Task Title', 'Task'),
  field('description', 'Description', 'Task'),
  field('status', 'Status', 'Task'),
  field('priority', 'Priority', 'Task'),
  field('owner', 'Owner', 'Task'),
  field('assignedTo', 'Assigned To', 'Task'),
  field('dueDate', 'Due Date', 'Task'),
  field('completedOn', 'Completed On', 'Task'),
  ...commonAuditFields,
]

const contactFields = [
  field('contactPerson', 'Contact Person', 'Contact'),
  field('designation', 'Designation', 'Contact'),
  field('email', 'Email', 'Contact'),
  field('alternateEmail', 'Alternate Email', 'Contact'),
  field('phone', 'Phone', 'Contact'),
  field('alternatePhone', 'Alternate Phone', 'Contact'),
  field('customerName', 'Customer Name', 'Contact'),
  field('accountName', 'Account Name', 'Contact'),
  field('owner', 'Owner', 'Contact'),
  field('state', 'State', 'Contact'),
  ...commonAuditFields,
]

const activityFields = [
  field('activityType', 'Activity Type', 'Activity'),
  field('activityDate', 'Activity Date', 'Activity'),
  field('activityBy', 'Activity By', 'Activity'),
  field('module', 'Module', 'Activity'),
  field('subject', 'Subject', 'Activity'),
  field('description', 'Description', 'Activity'),
  field('status', 'Status', 'Activity'),
  ...commonAuditFields,
]

export const CUSTOM_REPORT_CONTEXTS = [
  { key: 'account', label: 'Account', categoryKey: 'account', fields: accountFields },
  { key: 'customer', label: 'Customer', categoryKey: 'customer', fields: [...customerFields, ...remarkFields] },
  { key: 'deal', label: 'Deal', categoryKey: 'deal', fields: [...dealFields, ...customerFields.slice(0, 8), ...remarkFields] },
  { key: 'converted_deal', label: 'Converted Deal', categoryKey: 'deal', fields: [...dealFields, ...customerFields.slice(0, 8)] },
  { key: 'project', label: 'Project', categoryKey: 'project', fields: projectFields },
  { key: 'sr', label: 'SR (Service Request)', categoryKey: 'sr', fields: supportRequestFields },
  { key: 'closed_sr', label: 'Closed SR', categoryKey: 'closed_sr', fields: supportRequestFields },
  { key: 'lead', label: 'Lead', categoryKey: 'account', fields: accountFields },
  { key: 'contact', label: 'Contact', categoryKey: 'contact', fields: contactFields },
  { key: 'quotation', label: 'Quotation', categoryKey: 'quotation', fields: quotationFields },
  { key: 'activity', label: 'Activity', categoryKey: 'activity', fields: activityFields },
  { key: 'task', label: 'Task', categoryKey: 'task', fields: taskFields },
  { key: 'follow_up', label: 'Follow-up', categoryKey: 'task', fields: taskFields },
  { key: 'owner_wise_reports', label: 'Owner-wise Reports', categoryKey: 'owner', fields: [
    field('owner', 'Owner', 'Owner-wise Reports'),
    field('module', 'Module', 'Owner-wise Reports'),
    field('totalRecords', 'Total Records', 'Owner-wise Reports'),
    field('openRecords', 'Open Records', 'Owner-wise Reports'),
    field('closedRecords', 'Closed Records', 'Owner-wise Reports'),
  ] },
]

export const CUSTOM_REPORT_VISIBILITY_OPTIONS = [
  'Visible to Me Only',
  'Visible to My Group',
  'Visible to All',
  'Visible to Custom Users',
]

export const CUSTOM_REPORT_FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'between', label: 'Between' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
]

export const getCustomReportContext = (contextKey = 'account') => (
  CUSTOM_REPORT_CONTEXTS.find((context) => context.key === contextKey)
  || CUSTOM_REPORT_CONTEXTS[0]
)

export const getCustomReportFields = (contextKey = 'account') => getCustomReportContext(contextKey).fields

export const getCustomReportFieldLabel = (contextKey, fieldKey) => (
  getCustomReportFields(contextKey).find((entry) => entry.key === fieldKey)?.label
  || fieldKey
)

export const getGroupedCustomReportFields = (contextKey = 'account') => (
  getCustomReportFields(contextKey).reduce((groups, entry) => {
    const groupName = entry.group || 'Details'
    if (!groups[groupName]) groups[groupName] = []
    groups[groupName].push(entry)
    return groups
  }, {})
)
