const GROUP_DEFINITIONS = [
  {
    id: 'ahmedabad',
    label: 'Ahmedabad',
    userIds: ['user-006', 'user-007', 'user-014'],
  },
  {
    id: 'swati-sales-1',
    label: 'Swati Sales-1',
    userIds: ['user-001', 'user-002', 'user-004'],
  },
  {
    id: 'swati-sales-2',
    label: 'Swati Sales-2',
    userIds: ['user-005', 'user-009', 'user-010'],
  },
]

const TYPE_DEFINITIONS = [
  {
    id: 'admin',
    label: 'ADMIN',
    userIds: ['user-006', 'user-007', 'user-014'],
  },
  {
    id: 'customer-support-field-staff',
    label: 'Customer Support Field Staff',
    userIds: ['user-016', 'user-017'],
  },
  {
    id: 'manager',
    label: 'Manager',
    userIds: ['user-012', 'user-015'],
  },
  {
    id: 'sales-team',
    label: 'Sales Team',
    userIds: ['user-001', 'user-002', 'user-003', 'user-004', 'user-005', 'user-008', 'user-009', 'user-010', 'user-011', 'user-013'],
  },
]

const USER_ATTENDANCE = {
  'user-001': { status: 'Present', punchIn: '09:12 AM', punchOut: '06:18 PM' },
  'user-002': { status: 'Present', punchIn: '09:03 AM', punchOut: '06:01 PM' },
  'user-003': { status: 'Present', punchIn: '09:21 AM', punchOut: '06:08 PM' },
  'user-004': { status: 'Present', punchIn: '09:05 AM', punchOut: '06:00 PM' },
  'user-005': { status: 'Present', punchIn: '09:17 AM', punchOut: '06:14 PM' },
  'user-006': { status: 'Present', punchIn: '08:54 AM', punchOut: '05:49 PM' },
  'user-007': { status: 'Present', punchIn: '08:58 AM', punchOut: '05:56 PM' },
  'user-008': { status: 'Leave', punchIn: '-', punchOut: '-' },
  'user-009': { status: 'Present', punchIn: '09:25 AM', punchOut: '06:23 PM' },
  'user-010': { status: 'Present', punchIn: '09:14 AM', punchOut: '06:12 PM' },
  'user-011': { status: 'Present', punchIn: '09:31 AM', punchOut: '06:28 PM' },
  'user-012': { status: 'Present', punchIn: '08:49 AM', punchOut: '05:47 PM' },
  'user-013': { status: 'Absent', punchIn: '-', punchOut: '-' },
  'user-014': { status: 'Present', punchIn: '08:57 AM', punchOut: '05:52 PM' },
  'user-015': { status: 'Present', punchIn: '09:10 AM', punchOut: '06:04 PM' },
  'user-016': { status: 'Present', punchIn: '09:08 AM', punchOut: '06:02 PM' },
  'user-017': { status: 'Present', punchIn: '09:19 AM', punchOut: '06:15 PM' },
}

const buildUsersById = (users) => (
  users.reduce((lookup, user) => ({
    ...lookup,
    [user.id]: user,
  }), {})
)

const mapUsersForNode = (userIds, usersById) => (
  userIds
    .map((userId) => usersById[userId])
    .filter(Boolean)
)

export const getTeamViewGroups = (users) => {
  const usersById = buildUsersById(users)

  return GROUP_DEFINITIONS.map((entry) => ({
    ...entry,
    users: mapUsersForNode(entry.userIds, usersById),
  }))
}

export const getTeamViewTypes = (users) => {
  const usersById = buildUsersById(users)

  return TYPE_DEFINITIONS.map((entry) => ({
    ...entry,
    users: mapUsersForNode(entry.userIds, usersById),
  }))
}

export const enrichUsersForTeamView = (users) => {
  const groups = getTeamViewGroups(users)
  const types = getTeamViewTypes(users)

  return users.map((user) => {
    const group = groups.find((entry) => entry.userIds.includes(user.id))
    const type = types.find((entry) => entry.userIds.includes(user.id))
    const attendance = USER_ATTENDANCE[user.id] || { status: 'Unknown', punchIn: '-', punchOut: '-' }

    return {
      ...user,
      userGroup: group?.label || '-',
      userType: type?.label || '-',
      attendanceStatus: attendance.status,
      punchIn: attendance.punchIn,
      punchOut: attendance.punchOut,
    }
  })
}

export const getAttendanceRows = (users, filterMode, selectedYear, selectedMonth) => (
  enrichUsersForTeamView(users).map((user) => ({
    id: `${user.id}-${filterMode}-${selectedYear}-${selectedMonth}`,
    name: user.name,
    userType: user.userType,
    userGroup: user.userGroup,
    year: selectedYear,
    month: selectedMonth,
    mode: filterMode,
    punchIn: user.punchIn,
    punchOut: user.punchOut,
    status: user.attendanceStatus,
  }))
)
