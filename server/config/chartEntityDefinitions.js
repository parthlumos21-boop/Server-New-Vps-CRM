const chartEntityDefinitions = {
  accounts: {
    label: "Accounts",
    collection: "leads",
    classificationFields: [
      { key: "status", label: "Account Status", type: "string" },
      { key: "accountCategory", label: "Account Category", type: "string" },
      { key: "accountOwner", label: "Account Owner", type: "user" },
      { key: "accountType", label: "Account Type", type: "string" },
      { key: "industryType", label: "Industry", type: "string" }
    ],
    dateFields: [
      { key: "createdAt", label: "Created Date" },
      { key: "updatedAt", label: "Updated Date" }
    ],
    numericFields: []
  },
  deals: {
    label: "Deals",
    collection: "deals",
    classificationFields: [
      { key: "stage", label: "Deal Stage", type: "string" },
      { key: "dealOwner", label: "Deal Owner", type: "user" },
      { key: "dealType", label: "Deal Type", type: "string" },
      { key: "consultantName", label: "Consultant", type: "string" }
    ],
    dateFields: [
      { key: "createdAt", label: "Created Date" },
      { key: "closingDate", label: "Closing Date" }
    ],
    numericFields: [
      { key: "amount", label: "Deal Value" },
      { key: "expectedValue", label: "Expected Value" }
    ]
  },
  customers: {
    label: "Customers",
    collection: "customers",
    classificationFields: [
      { key: "status", label: "Customer Status", type: "string" },
      { key: "customerOwner", label: "Customer Owner", type: "user" },
      { key: "customerCategory", label: "Customer Category", type: "string" },
      { key: "productCategory", label: "Product Category", type: "string" }
    ],
    dateFields: [
      { key: "createdAt", label: "Created Date" }
    ],
    numericFields: []
  },
  quotations: {
    label: "Quotations",
    collection: "quotations",
    classificationFields: [
      { key: "status", label: "Quotation Status", type: "string" },
      { key: "quotationOwner", label: "Quotation Owner", type: "user" },
      { key: "quotationType", label: "Quotation Type", type: "string" }
    ],
    dateFields: [
      { key: "createdAt", label: "Created Date" }
    ],
    numericFields: [
      { key: "grandTotal", label: "Grand Total" },
      { key: "total", label: "Total Amount" }
    ]
  },
  sr: {
    label: "Support Requests",
    collection: "support_requests",
    classificationFields: [
      { key: "status", label: "Status", type: "string" },
      { key: "owner", label: "Owner", type: "user" },
      { key: "requestType", label: "Request Type", type: "string" }
    ],
    dateFields: [
      { key: "createdAt", label: "Created Date" }
    ],
    numericFields: []
  }
}

module.exports = chartEntityDefinitions
