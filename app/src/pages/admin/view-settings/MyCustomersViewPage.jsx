import React from 'react'
import ViewSettingsSubPage from './ViewSettingsSubPage'

const FIELDS = [
  'Customer Name', 'Added Date', 'Customer Category', 'Customer Owner',
  'Customer Status', 'Contact Person', 'Email', 'Phone', 'Address',
  'Customer Type', 'Product Category', 'Designation', 'Project Name',
  'State', 'Industry Type', 'GSTIN', 'State Code', 'Alternate Email',
  'Alternate Phone', 'Job No', 'Added By', 'Last Updated', 'Latest Remark',
]

const DEFAULT_SELECTED = [
  'Customer Name', 'Added Date', 'Email', 'Phone',
  'Customer Category', 'Customer Owner', 'Customer Status',
]

const CLASSIFICATION_GROUPS = {
  'Customer Category': ['MARKETING-LUMOS', 'MARKETING-SWATI'],
  'Customer Status': ['New', 'Active', 'Future Prospect', 'Rejected', 'Converted', 'OLD', 'Closed'],
}

const MyCustomersViewPage = ({ basePath = '/admin/view-settings' }) => (
  <ViewSettingsSubPage
    title="My Customers View"
    fields={FIELDS}
    defaultSelected={DEFAULT_SELECTED}
    classificationGroups={CLASSIFICATION_GROUPS}
    defaultClassificationField="Customer Category"
    leftPanelTitle="Customer Attributes"
    simpleClassification
    defaultViewClassificationOn
    basePath={basePath}
  />
)

export default MyCustomersViewPage
