import React from 'react'
import SupportRequestReportBuilder from './SupportRequestReportBuilder'

const AddSupportRequestReportPage = () => (
  <SupportRequestReportBuilder
    title="Add Support Request Report"
    entityType="SR"
    typeLabel="SR"
    categoryKey="sr"
    templateVariant="open"
    defaultDescription="Support Request Report Template"
  />
)

export default AddSupportRequestReportPage
