import swatiLogo from '../../../assets/swati-logo.png'
import lumosLogo from '../../../assets/lumos-logo.svg'

const normalizeKey = (value) => String(value || '').trim().toUpperCase()

const ACCOUNT_CATEGORY_LOGO_MAP = {
  SWATI: { src: swatiLogo, alt: 'Swati' },
  LUMOS: { src: lumosLogo, alt: 'Lumos' },
}

export const getAccountCategoryLogo = (category) => {
  const key = normalizeKey(category)
  return ACCOUNT_CATEGORY_LOGO_MAP[key] || null
}

export const ACCOUNT_CATEGORY_LOGO_KEYS = Object.keys(ACCOUNT_CATEGORY_LOGO_MAP)
