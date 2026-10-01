import { ACCOUNT_SOURCE_DEFINITIONS } from '../../accounts/config/accountDropdownOptions'

export const ACCOUNT_SOURCE_TABS = ACCOUNT_SOURCE_DEFINITIONS.map((source, index) => ({
  key: source.key,
  label: source.label,
  order: index + 1,
}))

const SOURCE_BUCKET_MATCHERS = {
  call: ['call'],
  email: ['e-mail', 'email', 'mail'],
  internal: ['internal'],
  social_media: ['social media', 'social', 'instagram', 'facebook', 'linkedin', 'whatsapp'],
  website: ['website', 'web', 'site'],
}

const normalizeSourceValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

export const getAccountSourceBucket = (value) => {
  const normalized = normalizeSourceValue(value)
  if (!normalized) return null

  return ACCOUNT_SOURCE_TABS.find((tab) =>
    SOURCE_BUCKET_MATCHERS[tab.key]?.some((matcher) => normalized.includes(matcher))
  ) || null
}
