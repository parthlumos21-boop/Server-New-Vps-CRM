export const SW_BARODA_MUM_TABS = [
  { key: 'jagruti-parmar', label: 'Jagurti Parmar', order: 1, visible: true, ownerNames: ['Jagurti Parmar', 'Jagruti Parmar'] },
  { key: 'monali-pataliya', label: 'Monali Pataliya', order: 2, visible: true, ownerNames: ['Monali Pataliya'] },
  { key: 'rajeshree-parmar', label: 'Rajeshree Parmar', order: 4, visible: true, ownerNames: ['Rajeshree Parmar'] },
  { key: 'support-swati', label: 'Support Swati', order: 5, visible: true, ownerNames: ['Support Swati'] },
  { key: 'tajamul-solkar', label: 'Tajamul Rafique Solkar', order: 6, visible: true, ownerNames: ['Tajamul Rafique Solkar', 'Tajamul Solkar'] },
  { key: 'vaibhavi-patel', label: 'Vaibhavi Patel', order: 7, visible: true, ownerNames: ['Vaibhavi Patel'] },
]

const normalizeValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

export const getSwBarodaMumTabMatch = (accountOwner) => {
  const normalizedOwner = normalizeValue(accountOwner)
  if (!normalizedOwner) return null

  return SW_BARODA_MUM_TABS.find((tab) =>
    tab.ownerNames.some((ownerName) => normalizeValue(ownerName) === normalizedOwner)
  ) || null
}
