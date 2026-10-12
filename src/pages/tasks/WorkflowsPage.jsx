import React, { useState, useEffect } from 'react'
import {
  FaSyncAlt,
  FaPlus,
  FaBolt,
  FaCheckCircle,
  FaToggleOn,
  FaToggleOff,
} from 'react-icons/fa'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import workManagementService from '../../services/workManagementService'
import Modal from '../../components/common/Modal'

export const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    triggerEvent: 'deal_won',
    targetAction: 'create_project',
    templateName: 'Standard Turnkey Switchgear Project',
  })

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      const data = await workManagementService.getWorkflows()
      setWorkflows(data || [])
    } catch (err) {
      console.error('Failed to load workflows', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await workManagementService.createWorkflow(formData)
      setCreateModalOpen(false)
      setFormData({
        title: '',
        triggerEvent: 'deal_won',
        targetAction: 'create_project',
        templateName: 'Standard Turnkey Switchgear Project',
      })
      fetchWorkflows()
    } catch (err) {
      console.error('Failed to create workflow', err)
    }
  }

  return (
    <TaskWorkspaceLayout activeTabKey="workflows">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
            Event-Driven Automation Engine
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Configure automatic task and project instantiation triggered by CRM deal and quotation lifecycle events
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            className="ap-header-item-btn"
            onClick={fetchWorkflows}
            title="Refresh Workflows"
          >
            <FaSyncAlt />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="ap-tab-add"
            onClick={() => setCreateModalOpen(true)}
          >
            <FaPlus />
            <span>New Automation Rule</span>
          </button>
        </div>
      </div>

      <TaskCardShell
        title="Active CRM Automation Rules"
        icon={<FaSyncAlt />}
        subtitle="Pre-configured triggers that execute non-intrusively in the background"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {workflows.map((wf) => (
            <div
              key={wf.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaBolt style={{ color: '#c60016', fontSize: '0.85rem' }} />
                  <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' }}>
                    {wf.title}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '8px',
                      background: wf.active ? '#f0fdf4' : '#f1f5f9',
                      color: wf.active ? '#15803d' : '#64748b',
                      fontWeight: '800',
                    }}
                  >
                    {wf.active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.78rem', color: '#64748b' }}>
                  <span>
                    <strong>Trigger:</strong> <code style={{ color: '#2563eb' }}>{wf.triggerEvent}</code>
                  </span>
                  <span>➔</span>
                  <span>
                    <strong>Action:</strong> <code style={{ color: '#15803d' }}>{wf.targetAction}</code>
                  </span>
                  {wf.templateName && (
                    <span>
                      (Template: <em>{wf.templateName}</em>)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ color: wf.active ? '#15803d' : '#94a3b8', fontSize: '1.4rem' }}>
                  {wf.active ? <FaToggleOn /> : <FaToggleOff />}
                </span>
              </div>
            </div>
          ))}
        </div>
      </TaskCardShell>

      {/* New Workflow Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Automation Rule"
        size="small"
        footer={
          <>
            <button type="button" className="ap-modal-btn ap-modal-btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="ap-modal-btn ap-modal-btn-primary" onClick={handleCreate}>
              Save Rule
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
              Rule Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. When Deal Won Auto Create Project"
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
              CRM Trigger Event
            </label>
            <select
              value={formData.triggerEvent}
              onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
            >
              <option value="deal_won">Deal Won (Deal stage updated to won/converted)</option>
              <option value="quotation_approved">Quotation Approved</option>
              <option value="sla_threshold_80">SLA Breach Warning (80% time elapsed)</option>
              <option value="task_completed">Task Completed</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>
              Target Automation Action
            </label>
            <select
              value={formData.targetAction}
              onChange={(e) => setFormData({ ...formData, targetAction: e.target.value })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
            >
              <option value="create_project">Create Project & Standard Milestones</option>
              <option value="create_task">Generate Follow-up Deliverable Task</option>
              <option value="send_lead_alert">Send Team Lead SLA Alert</option>
            </select>
          </div>
        </form>
      </Modal>
    </TaskWorkspaceLayout>
  )
}

export default WorkflowsPage
