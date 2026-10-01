import React from 'react'
import SupportRequestReportBuilder from './SupportRequestReportBuilder'

const AddClosedSupportRequestReportPage = () => (
  <SupportRequestReportBuilder
    title="Add Closed Support Request Report"
    entityType="SR"
    typeLabel="Closed SR"
    categoryKey="closed_sr"
    templateVariant="closed"
    defaultDescription="Closed Support Request Report Template"
    defaultOrderBy="closedOn"
    defaultFilters={[
      {
        field: 'status',
        operator: 'equals',
        value: 'closed',
      },
    ]}
  />
)

export default AddClosedSupportRequestReportPage
