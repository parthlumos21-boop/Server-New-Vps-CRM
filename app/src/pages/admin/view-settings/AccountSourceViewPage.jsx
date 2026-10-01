import React from 'react'
import ViewSettingsSubPage from './ViewSettingsSubPage'

const FIELDS = [
  'Account No.', 'Account Name', 'Account Date', 'Account Category',
  'Account Owner', 'Account Status', 'Account Source', 'Account State',
  'Contact Person', 'Phone', 'Email', 'Alternate Phone', 'Alternate Email',
  'Customer Type', 'Project Name', 'Product Category', 'State', 'Location',
  'Description', 'Industry type', 'Inquiry Ref No.', 'Address',
  'Inquiry Ref Date', 'Consultant Name', 'PO Value',
  'Status of Customer as per Order Received',
  'Status Of Customer as per quotation Given',
  'GSTIN', 'State Code', 'Job No', 'Reason For Lost',
  'Customer Name', 'Account Subsource', 'Added By', 'Added On', 'Last Updated',
]

const DEFAULT_SELECTED = [
  'Account No.', 'Account Name', 'Phone', 'Email',
]

const AccountSourceViewPage = ({ basePath = '/admin/view-settings' }) => (
  <ViewSettingsSubPage
    title="Account Source View"
    fields={FIELDS}
    defaultSelected={DEFAULT_SELECTED}
    leftPanelTitle="Account Attributes"
    simple
    basePath={basePath}
  />
)

export default AccountSourceViewPage
