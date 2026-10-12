import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEdit, FaTrash } from 'react-icons/fa'
import emailTemplateApi from '../../../services/emailTemplateApi'
import './EmailTemplatesPage.css'

const PAGE_SIZE = 10

const EmailTemplatesAllPage = () => {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextPage = page) => {
    setLoading(true)
    setError('')
    try {
      const result = await emailTemplateApi.list({ page: nextPage, limit: PAGE_SIZE, sort: 'latest' })
      setRows(Array.isArray(result?.records) ? result.records : [])
      setMeta({
        total: Number(result?.total || 0),
        totalPages: Math.max(1, Number(result?.totalPages || 1)),
      })
      setPage(Number(result?.page || nextPage))
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load templates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  const goToPage = (nextPage) => {
    const bounded = Math.min(meta.totalPages, Math.max(1, nextPage))
    load(bounded)
  }

  const editTemplate = (template) => {
    navigate('/admin/email-templates', { state: { template } })
  }

  const toggleStatus = async (template) => {
    setError('')
    try {
      await emailTemplateApi.updateStatus(template.id, {
        status: template.status === 'active' ? 'inactive' : 'active',
      })
      await load(page)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update status.')
    }
  }

  const deleteTemplate = async (template) => {
    if (!window.confirm(`Delete "${template.name}"?`)) return
    setError('')
    try {
      await emailTemplateApi.remove(template.id)
      await load(page)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete template.')
    }
  }

  return (
    <section className="email-templates-page">
      <header className="email-templates-header">
        <div>
          <span>Email</span>
          <h1>All Email Templates</h1>
        </div>
        <button type="button" className="email-template-secondary" onClick={() => navigate('/admin/email-templates')}>
          Back
        </button>
      </header>

      {error ? <div className="email-template-alert email-template-alert--error">{error}</div> : null}

      <div className="email-template-list">
        <div className="email-template-list-head">
          <h2>Templates</h2>
          <span className="email-template-muted">{meta.total} records</span>
        </div>

        <div className="email-template-table-wrap">
          <table className="email-template-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Default</th>
                <th>Subject</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7">Loading templates...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="7">No templates found.</td></tr>
              ) : rows.map((template) => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>{template.category}</td>
                  <td>{template.status}</td>
                  <td>{template.isDefault ? 'Yes' : 'No'}</td>
                  <td>{template.subject}</td>
                  <td>{template.createdAt ? new Date(template.createdAt).toLocaleString() : '-'}</td>
                  <td>
                    <div className="email-template-row-actions email-template-row-actions--table">
                      <button type="button" onClick={() => editTemplate(template)}><FaEdit /> Edit</button>
                      <button type="button" onClick={() => toggleStatus(template)}>{template.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                      <button type="button" className="danger" onClick={() => deleteTemplate(template)}><FaTrash /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="email-template-pagination">
          <button type="button" onClick={() => goToPage(1)} disabled={page <= 1 || loading}>First</button>
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}>Previous</button>
          <span>Page {page} of {meta.totalPages}</span>
          <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= meta.totalPages || loading}>Next</button>
          <button type="button" onClick={() => goToPage(meta.totalPages)} disabled={page >= meta.totalPages || loading}>Last</button>
        </div>
      </div>
    </section>
  )
}

export default EmailTemplatesAllPage
