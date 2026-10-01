export const ADMIN_CHART_CATEGORIES = [
  'Accounts',
  'Customers',
  'SR',
  'Deals',
]

export const ADMIN_CHART_DEFINITIONS = {
  Accounts: [
    {
      id: 'chart-accounts-overview',
      title: 'ACCOUNTS',
      type: 'Card',
      mobileEnabled: false,
      active: false,
    },
    {
      id: 'chart-accounts-status',
      title: 'Accounts Status',
      type: 'Card',
      mobileEnabled: false,
      active: false,
    },
    {
      id: 'chart-enquiry-from',
      title: 'Enquiry From',
      type: 'Pie',
      mobileEnabled: true,
      active: true,
    },
    {
      id: 'chart-enquiry-status',
      title: 'Enquiry Status',
      type: 'Pie',
      mobileEnabled: true,
      active: true,
    },
  ],
  Customers: [],
  SR: [],
  Deals: [],
}
