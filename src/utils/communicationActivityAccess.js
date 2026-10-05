const normalize = (value) => String(value || '').trim().toLowerCase()

const KEVAL_EMAILS = new Set([
  'keval@swatiswitchgears.com',
  'keval@swatiswtichgears.com',
])

export const canSeeAllCommunicationActivities = (user = {}) => (
  KEVAL_EMAILS.has(normalize(user.email))
)

export const isOwnCommunicationActivity = (remark = {}, user = {}) => {
  if (!user) return false

  const userValues = [
    user.id,
    user._id,
    user.name,
    user.username,
    user.email,
    user.ownerCode,
    user.employeeId,
  ].map(normalize).filter(Boolean)

  if (userValues.length === 0) return false

  const remarkValues = [
    remark.createdBy,
    remark.createdByName,
    remark.createdByEmail,
    remark.accountOwnerName,
    remark.accountOwnerEmail,
    remark.dealOwnerName,
    remark.dealOwnerEmail,
    remark.ownerName,
    remark.ownerEmail,
    remark.recordOwnerName,
    remark.assignedTo,
    remark.assignedUserId,
    remark.ownerUserId,
    remark.ownerCode,
    remark.accountOwnerCode,
  ].map(normalize).filter(Boolean)

  return remarkValues.some((remarkValue) => (
    userValues.some((userValue) => (
      remarkValue === userValue
      || (userValue.includes('@') && remarkValue.includes(userValue))
      || (!userValue.includes('@') && userValue.length > 2 && remarkValue.includes(userValue))
    ))
  ))
}

export const filterCommunicationActivitiesForUser = (remarks = [], user = {}, { allowAll = false } = {}) => {
  if (allowAll || canSeeAllCommunicationActivities(user)) return remarks
  return remarks.filter((remark) => isOwnCommunicationActivity(remark, user))
}
