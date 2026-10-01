const actionBaseRoute = '/admin/accounts/actions'

export const ACCOUNT_ACTION_DROPDOWN_LABEL = 'Actions'

const actionConfig = [
  {
    key: 'add-note-remarks',
    order: 1,
    label: 'Add Notes/Remarks',
    route: `${actionBaseRoute}/add-note-remarks`,
    placeholderTitle: 'Add Notes/Remarks',
    heading: 'Add Notes/Remarks',
    description: 'Create account notes, remarks, and follow-up history for the selected account.',
  },
  {
    key: 'add-reminder',
    order: 2,
    label: 'Add Reminder',
    route: `${actionBaseRoute}/add-reminder`,
    placeholderTitle: 'Add Reminder',
    heading: 'Add Reminder',
    description: 'Schedule a reminder or follow-up for the selected account.',
  },
  {
    key: 'change-status',
    order: 3,
    label: 'Change Status',
    route: `${actionBaseRoute}/change-status`,
    placeholderTitle: 'Change Status',
    heading: 'Change Status',
    description: 'Update the account stage and status note.',
  },
  {
    key: 'add-document',
    order: 4,
    label: 'Add Document',
    route: `${actionBaseRoute}/add-document`,
    placeholderTitle: 'Add Document',
    heading: 'Add Document',
    description: 'Attach document information to the selected account.',
  },
  {
    key: 're-assign-account',
    order: 5,
    label: 'Re-Assign Account',
    route: `${actionBaseRoute}/re-assign-account`,
    placeholderTitle: 'Re-Assign Account',
    heading: 'Re-Assign Account',
    description: 'Assign the selected account to another owner.',
  },
  {
    key: 'generate-quotation',
    order: 6,
    label: 'Generate Quotation',
    route: '',
    placeholderTitle: 'Generate Quotation',
    heading: 'Generate Quotation',
    description: 'Open the quotation generator for the selected account.',
    behavior: 'quotationGenerator',
  },

  {
    key: 'view-account',
    order: 7,
    label: 'View Account',
    route: '',
    placeholderTitle: 'View Account',
    heading: 'View Account',
    description: 'View Account opens the existing account details workspace.',
    behavior: 'drawer',
  },
  {
    key: 'converted-deal',
    order: 8,
    label: 'Convert to Deal',
    route: `${actionBaseRoute}/converted-deal`,
    placeholderTitle: 'Converted Deal',
    heading: 'Converted Deal',
    description: 'Convert the selected account into a linked deal.',
  },
  {
    key: 'view-linked-deal',
    order: 8.5,
    label: 'View Deal',
    route: '',
    placeholderTitle: 'View Deal',
    heading: 'View Deal',
    description: 'Open the deal linked with the selected account.',
    behavior: 'viewDeal',
  },
  {
    key: 'manage-account',
    order: 9,
    label: 'Manage Account',
    route: `${actionBaseRoute}/manage-account`,
    placeholderTitle: 'Manage Account',
    heading: 'Manage Account',
    description: 'Open the account management workspace for the selected account.',
  },
]

export const ACCOUNT_ACTIONS = [...actionConfig].sort((left, right) => left.order - right.order)
export const ACCOUNT_DRAWER_ACTIONS = ACCOUNT_ACTIONS.filter((action) => action.behavior !== 'drawer')
export const ACCOUNT_ROW_ACTIONS = ACCOUNT_ACTIONS

const userAccountActionKeys = [
  'add-note-remarks',
  'add-reminder',
  'change-status',
  'add-document',
  'generate-quotation',
  'view-account',
  'converted-deal',
  'view-linked-deal',
  'manage-account',
]


export const USER_ACCOUNT_ROW_ACTIONS = ACCOUNT_ACTIONS.filter((action) => userAccountActionKeys.includes(action.key))
export const USER_ACCOUNT_DRAWER_ACTIONS = USER_ACCOUNT_ROW_ACTIONS.filter((action) => action.behavior !== 'drawer')

export const ACCOUNT_ACTION_MAP = ACCOUNT_ACTIONS.reduce((lookup, action) => {
  lookup[action.key] = action
  return lookup
}, {})

export const USER_ACCOUNT_ACTION_MAP = USER_ACCOUNT_ROW_ACTIONS.reduce((lookup, action) => {
  lookup[action.key] = action
  return lookup
}, {})
