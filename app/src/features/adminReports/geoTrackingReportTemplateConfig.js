const toOption = (value, label = value) => ({
  value,
  label,
})

export const GEO_TRACKING_REPORT_CONTEXT_OPTIONS = [
  toOption('normal', 'Normal'),
]

export const GEO_TRACKING_REPORT_VISIBILITY_OPTIONS = [
  toOption('Visible to Me Only', 'Visible to Me Only'),
  toOption('All', 'All'),
]

export const GEO_TRACKING_REPORT_FIELD_GROUPS = [
  {
    title: 'Geo Tracking Attributes',
    fields: [
      { key: 'date', label: 'Date' },
      { key: 'l1', label: 'L1' },
      { key: 'l2', label: 'L2' },
      { key: 'location', label: 'Location' },
      { key: 'user', label: 'User' },
      { key: 'context', label: 'Context' },
      { key: 'note', label: 'Note' },
      { key: 'action', label: 'Action' },
      { key: 'distanceKilometers', label: 'Distance in Kilometers' },
      { key: 'timeSpentCheckInToCheckOut', label: 'Time Spent (Check-in to Check-out)' },
    ],
  },
]

export const GEO_TRACKING_REPORT_FIELD_OPTIONS = GEO_TRACKING_REPORT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
)

export const GEO_TRACKING_REPORT_GROUP_BY_OPTIONS = [
  toOption('', 'Select'),
  toOption('date', 'Date'),
  toOption('user', 'User'),
  toOption('location', 'Location'),
  toOption('context', 'Context'),
  toOption('action', 'Action'),
  toOption('l1', 'L1'),
  toOption('l2', 'L2'),
]

export const GEO_TRACKING_REPORT_ORDER_BY_OPTIONS = [
  toOption('', 'Select'),
  ...GEO_TRACKING_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const GEO_TRACKING_REPORT_AGGREGATE_OPTIONS = [
  toOption('', 'Select'),
  toOption('distanceKilometers', 'Distance in Kilometers'),
  toOption('timeSpentCheckInToCheckOut', 'Time Spent (Check-in to Check-out)'),
]

export const GEO_TRACKING_REPORT_FILTER_FIELD_OPTIONS = [
  toOption('', 'Select'),
  ...GEO_TRACKING_REPORT_FIELD_OPTIONS.map((field) => toOption(field.key, field.label)),
]

export const GEO_TRACKING_REPORT_FILTER_OPERATOR_OPTIONS = [
  toOption('equals', 'equal'),
  toOption('not_equals', 'not equal'),
  toOption('contains', 'contains'),
  toOption('not_contains', 'not contains'),
  toOption('starts_with', 'starts with'),
  toOption('ends_with', 'ends with'),
  toOption('is_empty', 'is empty'),
  toOption('is_not_empty', 'is not empty'),
]
