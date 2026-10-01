// Customer field mappings for bulk import
export const BULK_UPLOAD_CUSTOMER_FIELD_OPTIONS = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'website', label: 'Website' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
  { value: 'zipCode', label: 'Zip Code' },
  { value: 'description', label: 'Description' },
]

export const BULK_UPLOAD_CUSTOMER_REQUIRED_FIELDS = ['email']

export const BULK_UPLOAD_CUSTOMER_DUPLICATE_OPTIONS = [
  { value: 'phone', label: 'If Phone exist' },
  { value: 'email', label: 'If Email exist' },
]

export const BULK_UPLOAD_CUSTOMER_DUPLICATE_ACTIONS = [
  { value: 'skip', label: 'Skip' },
  { value: 'update', label: 'Update' },
  { value: 'error', label: 'Stop Import' },
]

export const BULK_UPLOAD_CUSTOMER_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ROWS: 1000,
  ALLOWED_EXTENSIONS: ['csv'],
  PREVIEW_ROWS: 5,
}

export const BULK_UPLOAD_CUSTOMER_STEPS = [
  {
    id: 'choose-file',
    label: 'Choose Data File',
    description: 'Select a CSV file',
  },
  {
    id: 'select-fields',
    label: 'Select Fields',
    description: 'Map your data',
  },
  {
    id: 'verify',
    label: 'Verify',
    description: 'Review & confirm',
  },
]
