// CSV field mappings - account fields that can be bulk imported
export const BULK_UPLOAD_FIELD_OPTIONS = [
  { value: 'name', label: 'Account Name' },
  { value: 'accountNumber', label: 'Account No.' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'website', label: 'Website' },
  { value: 'industry', label: 'Industry' },
  { value: 'accountOwner', label: 'Account Owner' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
  { value: 'zipCode', label: 'Zip Code' },
  { value: 'description', label: 'Description' },
]

export const BULK_UPLOAD_REQUIRED_FIELDS = ['name']

export const BULK_UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ROWS: 1000,
  ALLOWED_EXTENSIONS: ['csv'],
  PREVIEW_ROWS: 5,
}

export const BULK_UPLOAD_STEPS = [
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
