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

export const getTeamViewGroups = (users, dbGroups = []) => {
  return dbGroups.map((group) => {
    const groupName = String(group.groupName || group.name || group.title || '').trim()
    const apiUsers = Array.isArray(group.users) ? group.users : []
    const apiGroupUsers = apiUsers.map((member, index) => ({
      id: String(member.userId || member.id || member.email || `${groupName}-${index}`),
      userId: member.userId || member.id || '',
      name: member.name || member.member?.name || '-',
      email: member.email || member.member?.email || '',
      userGroup: groupName,
      userType: member.role || member.userType || member.designation || '-',
      role: member.role || '',
      designation: member.designation || '',
      attendanceStatus: member.attendanceStatus || '-',
      punchIn: member.punchIn || '-',
      punchOut: member.punchOut || '-',
      status: member.status || 'active',
    }))

    return {
      id: String(group.mongoId || group._id || group.id || groupName),
      label: groupName,
      users: apiGroupUsers.length > 0
        ? apiGroupUsers
        : users.filter((user) => String(user.userGroup || user.user_group || '').trim() === groupName),
    }
  }).filter((group) => group.label)
}

export const getTeamViewTypes = (users, dbTypes = []) => {
  return dbTypes.map((type) => {
    const typeName = String(type)
    return {
      id: typeName.toLowerCase().replace(/\s+/g, '-'),
      label: typeName,
      users: users.filter(u => String(u.designation || '').trim() === typeName),
    }
  })
}

export const enrichUsersForTeamView = (users) => {
  return users.map((user) => {
    const attendance = USER_ATTENDANCE[user.id] || { status: 'Unknown', punchIn: '-', punchOut: '-' }

    return {
      ...user,
      userGroup: user.userGroup || user.user_group || '-',
      userType: user.designation || '-',
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
