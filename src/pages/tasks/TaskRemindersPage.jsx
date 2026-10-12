import React from 'react'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import Tasks from './Tasks'

export const TaskRemindersPage = () => {
  return (
    <TaskWorkspaceLayout activeTabKey="reminders">
      <Tasks />
    </TaskWorkspaceLayout>
  )
}

export default TaskRemindersPage
