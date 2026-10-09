module.exports = {
  // 1. ACCOUNTS (Collection: 'leads')
  account: {
    accountNo:       { key: 'accountNo',       label: 'Account No.',       dbField: 'accountNumber', type: 'string' },
    accountName:     { key: 'accountName',     label: 'Account Name',      dbField: 'companyName',   type: 'string' },
    accountOwner:    { key: 'accountOwner',    label: 'Account Owner',     dbField: 'accountOwner',  type: 'string' },
    accountOwnerCode:{ key: 'accountOwnerCode',label: 'Owner Code',        dbField: 'accountOwnerCode', type: 'string' },
    accountStatus:   { key: 'accountStatus',   label: 'Account Status',    dbField: 'status',        type: 'string' },
    accountCategory: { key: 'accountCategory', label: 'Account Category',  dbField: 'accountCategory', type: 'string' },
    accountSource:   { key: 'accountSource',   label: 'Account Source',    dbField: 'accountSource', type: 'string' },
    contactPerson:   { key: 'contactPerson',   label: 'Contact Person',    dbField: 'contactPerson', type: 'string' },
    phone:           { key: 'phone',           label: 'Phone',             dbField: 'phone',         type: 'phone' },
    email:           { key: 'email',           label: 'Email',             dbField: 'email',         type: 'email' },
    projectName:     { key: 'projectName',     label: 'Project Name',      dbField: 'projectName',   type: 'string' },
    location:        { key: 'location',        label: 'Location',          dbField: 'location',      type: 'string' },
    poValue:         { key: 'poValue',         label: 'PO Value',          dbField: 'poValue',       type: 'currency' },
    createdAt:       { key: 'createdAt',       label: 'Created At',        dbField: 'createdAt',     type: 'date' }
  },

  // 2. DEALS (Collection: 'deals')
  deal: {
    dealNumber:      { key: 'dealNumber',      label: 'Deal No.',          dbField: 'dealNumber',    type: 'string' },
    dealName:        { key: 'dealName',        label: 'Deal Name',         dbField: 'name',          type: 'string' },
    dealOwner:       { key: 'dealOwner',       label: 'Deal Owner',        dbField: 'dealOwner',     type: 'string' },
    ownerCode:       { key: 'ownerCode',       label: 'Owner Code',        dbField: 'ownerCode',     type: 'string' },
    dealStatus:      { key: 'dealStatus',      label: 'Deal Stage / Status',dbField: 'stage',        type: 'string' },
    dealValue:       { key: 'dealValue',       label: 'Deal Value',        dbField: 'amount',        type: 'currency' },
    dealType:        { key: 'dealType',        label: 'Deal Type',         dbField: 'dealType',      type: 'string' },
    customerName:    { key: 'customerName',    label: 'Customer Name',     dbField: 'customerName',  type: 'string' },
    projectName:     { key: 'projectName',     label: 'Project Name',      dbField: 'projectName',   type: 'string' },
    expectedClosureDate: { key: 'expectedClosureDate', label: 'Closure Date', dbField: 'expectedClosureDate', type: 'date' },
    poValue:         { key: 'poValue',         label: 'PO Value',          dbField: 'poValue',       type: 'currency' },
    createdAt:       { key: 'createdAt',       label: 'Created At',        dbField: 'createdAt',     type: 'date' }
  },

  // 3. CUSTOMERS (Collection: 'customers')
  customer: {
    customerNumber:  { key: 'customerNumber',  label: 'Customer No.',      dbField: 'customerNumber',type: 'string' },
    customerName:    { key: 'customerName',    label: 'Customer Name',     dbField: 'customerName',  type: 'string' },
    customerOwner:   { key: 'customerOwner',   label: 'Customer Owner',    dbField: 'customerOwner', type: 'string' },
    ownerCode:       { key: 'ownerCode',       label: 'Owner Code',        dbField: 'ownerCode',     type: 'string' },
    customerStatus:  { key: 'customerStatus',  label: 'Customer Status',   dbField: 'customerStatus',type: 'string' },
    customerCategory:{ key: 'customerCategory',label: 'Category',        dbField: 'customerCategory',type: 'string' },
    customerType:    { key: 'customerType',    label: 'Customer Type',     dbField: 'customerType',  type: 'string' },
    contactPerson:   { key: 'contactPerson',   label: 'Contact Person',    dbField: 'contactPerson', type: 'string' },
    phone:           { key: 'phone',           label: 'Phone',             dbField: 'phone',         type: 'phone' },
    email:           { key: 'email',           label: 'Email',             dbField: 'email',         type: 'email' },
    state:           { key: 'state',           label: 'State',             dbField: 'state',         type: 'string' },
    industryType:    { key: 'industryType',    label: 'Industry Type',     dbField: 'industryType',  type: 'string' },
    createdAt:       { key: 'createdAt',       label: 'Created At',        dbField: 'createdAt',     type: 'date' }
  },

  // 4. QUOTATIONS (Collection: 'quotations')
  quotation: {
    quotationNumber: { key: 'quotationNumber', label: 'Quotation No.',     dbField: 'quotationNumber',type: 'string' },
    quotationTitle:  { key: 'quotationTitle',  label: 'Quotation Title',   dbField: 'title',         type: 'string' },
    quotationOwner:  { key: 'quotationOwner',  label: 'Quotation Owner',   dbField: 'quotationOwner',type: 'string' },
    ownerCode:       { key: 'ownerCode',       label: 'Owner Code',        dbField: 'ownerCode',     type: 'string' },
    customerName:    { key: 'customerName',    label: 'Customer Name',     dbField: 'customerName',  type: 'string' },
    dealName:        { key: 'dealName',        label: 'Deal Name',         dbField: 'dealName',      type: 'string' },
    projectName:     { key: 'projectName',     label: 'Project Name',      dbField: 'projectName',   type: 'string' },
    status:          { key: 'status',          label: 'Quotation Status',  dbField: 'status',        type: 'string' },
    amount:          { key: 'amount',          label: 'Quotation Amount',  dbField: 'grandTotal',    type: 'currency' },
    validUntil:      { key: 'validUntil',      label: 'Valid Until',       dbField: 'validUntil',    type: 'date' },
    createdAt:       { key: 'createdAt',       label: 'Created At',        dbField: 'createdAt',     type: 'date' }
  }
};
