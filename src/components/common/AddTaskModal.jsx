import React, { useState, useEffect } from 'react'
import { useData } from '../../context/DataContext'
import Modal from './Modal'
import Input from './Input'
import Select from './Select'
import Button from './Button'
import { TASK_STATUS, PRIORITY_LEVELS } from '../../utils/constants'

const AddTaskModal = ({ isOpen, onClose, taskData = null }) => {
  const { createTask, updateTask, addNotification } = useData()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (taskData) {
        setFormData({
          title: taskData.title || '',
          description: taskData.description || '',
          status: taskData.status || 'pending',
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate || ''
        })
      } else {
        setFormData({
          title: '',
          description: '',
          status: 'pending',
          priority: 'medium',
          dueDate: ''
        })
      }
    }
  }, [isOpen, taskData])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = taskData 
      ? await updateTask(taskData.id, formData)
      : await createTask(formData)

    if (result.success) {
      addNotification('success', 'Success', `Task ${taskData ? 'updated' : 'created'} successfully`)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskData ? 'Edit Task' : 'Add New Task'}
    >
      <form onSubmit={handleSubmit} className="task-form">
        <Input
          label="Title *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          fullWidth
        />

        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          fullWidth
        />

        <Select
          label="Priority *"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          options={PRIORITY_LEVELS}
          required
          fullWidth
        />

        <Select
          label="Status *"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={TASK_STATUS}
          required
          fullWidth
        />

        <Input
          label="Due Date"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          fullWidth
        />

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {taskData ? 'Update' : 'Create'} Task
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddTaskModal
