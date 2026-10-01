import React from 'react'
import ViewSettingsSubPage from './ViewSettingsSubPage'
import {
  ACCOUNT_SOURCE_OPTIONS,
} from '../../../features/accounts/config/accountDropdownOptions'
import {
  ACCOUNT_CHANGE_STATUS_OPTIONS,
} from '../../../features/adminAccounts/config/accountStages'

const FIELDS = [
  'Account No.', 'Account Name', 'Account Date', 'Account Category', 'Account Owner',
  'Account Status', 'Account Source', 'Account State', 'Contact Person',
  'Phone', 'Email', 'Alternate Phone', 'Alternate Email', 'Customer Type',
  'Project Name', 'Product Category', 'State', 'Location', 'Description',
  'Industry type', 'Size', 'Customer Set No.', 'Address', 'Customer Bill Date',
  'Consultant Name', 'PO Value', 'Status of Customer as per Order Received',
  'Status of Customer as per quotation Given', 'GTIN', 'Store Code', 'Job No',
  'Reason For Lost', 'Customer Status', 'Account Submission', 'Added By',
  'Added On', 'Last Updated', 'Lower Barcode',
]

const DEFAULT_SELECTED = [
  'Account Name', 'Account Category', 'Project Name',
  'Reason For Lost', 'Account Owner',
]

const CLASSIFICATION_GROUPS = {
  'Account Category': ['MARKETING-SWATI'],
  'Account Status': ACCOUNT_CHANGE_STATUS_OPTIONS.map((option) => option.label),
  'Account Source': ACCOUNT_SOURCE_OPTIONS.map((option) => option.label),
  'Account State': ['Hot', 'Warm', 'Cold', 'Dead'],
}

const FILTER_VALUE_OPTIONS_BY_FIELD = {
  ...CLASSIFICATION_GROUPS,
}

const ACTIONS = [
  { label: 'Add Remark',       defaultChecked: false },
  { label: 'View Account',     defaultChecked: true  },
  { label: 'Add Reminder',     defaultChecked: false },
  { label: 'Reassign Account', defaultChecked: false },
  { label: 'Send Mail',        defaultChecked: false },
  { label: 'Send SMS',         defaultChecked: false },
  { label: 'Manage Account',   defaultChecked: false },
]

const MyAccountsViewPage = ({ basePath = '/admin/view-settings' }) => (
  <ViewSettingsSubPage
    title="My Accounts View"
    fields={FIELDS}
    defaultSelected={DEFAULT_SELECTED}
    classificationGroups={CLASSIFICATION_GROUPS}
    classificationField="Account Status"
    defaultClassificationField="Account Status"
    includeClassificationPlaceholder
    actions={ACTIONS}
    leftPanelTitle="Account Attributes"
    filterFieldOptions={FIELDS}
    filterValueOptionsByField={FILTER_VALUE_OPTIONS_BY_FIELD}
    orderByFieldOptions={FIELDS}
    defaultFiltersOn
    defaultOrderByOn
    basePath={basePath}
  />
)

export default MyAccountsViewPage
