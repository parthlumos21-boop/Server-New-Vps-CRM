export const ENTITY_CONTEXT_MAP = {
  Account: 'leads',
  Customer: 'customers',
  SR: 'support_requests',
  Deal: 'deals',
  Quotation: 'quotations',
}

export const CHART_FIELD_DEFINITIONS = {
  Account: {
    targetCollection: 'leads',
    classificationFields: ['Account Category', 'Account Owner', 'Account Status', 'Account Type', 'Industry Type', 'Added By'],
    dateFields: ['Added Date', 'Last Updated'],
    viewFields: [
      'Account No.', 'Account Name', 'Added Date', 'Account Category', 'Account Owner',
      'Account Status', 'Contact Person', 'Email', 'Phone', 'Address', 'Account Type',
      'Industry Type', 'GSTIN', 'State Code', 'Added By',
    ],
  },
  Customer: {
    targetCollection: 'customers',
    classificationFields: ['Customer Category', 'Customer Owner', 'Customer Status', 'Customer Type', 'Product Category', 'Industry Type', 'Added By'],
    dateFields: ['Added Date', 'Last Updated'],
    viewFields: [
      'Customer No.', 'Customer Name', 'Added Date', 'Customer Category', 'Customer Owner',
      'Customer Status', 'Contact Person', 'Email', 'Phone', 'Address', 'Customer Type',
      'Product Category', 'Designation', 'Project Name', 'State', 'Industry Type',
      'GSTIN', 'State Code', 'Added By',
    ],
  },
  SR: {
    targetCollection: 'support_requests',
    classificationFields: ['Request Type', 'Owner', 'Status', 'Under Warranty', 'Added By'],
    dateFields: ['Added Date', 'Last Updated'],
    viewFields: [
      'SR Number', 'SR Title', 'Added Date', 'Status', 'Priority', 'SR Owner', 'Customer Name',
      'Category', 'Sub Category', 'Description', 'Resolution', 'Added By',
    ],
  },
  Deal: {
    targetCollection: 'deals',
    classificationFields: ['Deal Status', 'Deal Owner', 'Deal Co-Owners', 'Deal Type', 'Consultant Name', 'Added By'],
    dateFields: ['Deal Date', 'Last Updated'],
    viewFields: [
      'Deal No.', 'Customer Name', 'Deal Date', 'Deal Type', 'Deal Name', 'Deal Owner',
      'Deal Co-Owners', 'Deal Status', 'Address', 'Last Updated', 'Latest Remark', 'Deal Value',
      'Job No', 'Project Name', 'Consultant Name',
    ],
  },
  Quotation: {
    targetCollection: 'quotations',
    classificationFields: ['Quotation Status', 'Quotation Owner', 'Quotation Type', 'Added By'],
    dateFields: ['Quotation Date', 'Added Date', 'Last Updated'],
    viewFields: [
      'Quotation No.', 'Account Name', 'Quotation Date', 'Quotation Owner', 'Quotation Status',
      'Grand Total', 'Added By', 'Last Updated',
    ],
  },
}
