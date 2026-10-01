import { getCrmOwnerLabels, getCrmOwnerOptions } from '../../users/crmUserDirectory'

const toOption = (label) => ({
  value: label,
  label,
})

// Account stages configuration
export const ACCOUNT_STAGES = [
  { value: 'new', label: 'New Lead' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'converted', label: 'Converted' },
]



export const ACCOUNT_CATEGORY_OPTIONS = [
  'LUMOS',
  'SWATI',
].map(toOption)

export const ACCOUNT_SOURCE_DEFINITIONS = [
  { key: 'call', value: 'CALL', label: 'CALL' },
  { key: 'email', value: 'E-MAIL', label: 'E-MAIL' },
  { key: 'internal', value: 'Internal', label: 'Internal' },
  { key: 'social_media', value: 'SOCIAL MEDIA', label: 'SOCIAL MEDIA' },
  { key: 'website', value: 'Website', label: 'Website' },
]

export const ACCOUNT_SOURCE_OPTIONS = ACCOUNT_SOURCE_DEFINITIONS.map(({ value, label }) => ({
  value,
  label,
}))

export const CUSTOMER_TYPE_LABELS = [
  'Consultant',
  'Contractor',
  'End-User',
  'Internal Lead',
  'OEM',
  'Project Manager',
]

export const CUSTOMER_TYPE_OPTIONS = CUSTOMER_TYPE_LABELS.map(toOption)

export const INDUSTRY_TYPE_LABELS = [
  'AUTOMATION',
  'AGRICULTURE & FOOD',
  'AUTOMOBILE',
  'SIEMENS',
  'CERAMIC & TILES',
  'CONTRACTOR',
  'CONSULTANT',
  'DAIRY',
  'DATA CENTER',
  'ENGINEERING',
  'ENERGY',
  'FERTILIZER',
  'GOVERNMENT',
  'HOTELS & HOSPITAL',
  'INSTITUTES',
  'INFRASTRUCTURE',
  'IT / COMMERCIAL',
  'OIL & GAS',
  'PHARMACEUTICAL & HEALTH CARE',
  'PAINT / CHEMICAL',
  'PAPER, PRINTING & PACKAGING',
  'PORTS / AIR PORTS',
  'POWER SECTOR',
  'POWER GENERATION',
  'RESIDENTIAL',
  'STEEL / METAL/TUBE/GLASS',
  'SOLAR',
  'TEXTILE',
  'WATER SAGMENT',
  'OTHER',
]

export const INDUSTRY_TYPE_OPTIONS = INDUSTRY_TYPE_LABELS.map(toOption)

export const STATE_LABELS = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

export const STATE_OPTIONS = STATE_LABELS.map(toOption)

export const SW_BARODA_MUM_OWNER_LABELS = [
  'Jagurti Parmar',
  'Monali Pataliya',
  'Rajeshree Parmar',
  'Support Swati',
  'Tajamul Rafique Solkar',
  'Vaibhavi Patel',
]
