const fs = require('fs');
const file = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/admin/support-requests/SupportRequestView.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace CRLF with LF
content = content.replace(/\r\n/g, '\n');

// 1. Add modal state variables
const stateAnchor = `const [searchQuery, setSearchQuery] = useState('')`;
const stateReplacement = `const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null)
  const [modalStatus, setModalStatus] = useState('Open')
  const [modalDescription, setModalDescription] = useState('')
  const [isSavingModal, setIsSavingModal] = useState(false)

  const isSupportUser = Boolean(user?.email?.trim().toLowerCase().endsWith('@support.com'))`;

if (content.includes(stateAnchor)) {
  content = content.replace(stateAnchor, stateReplacement);
}

// 2. Add openViewModal & handleSaveModal
const handlersAnchor = `const clearAllTypes = () => setSelectedTypes([])`;
const handlersReplacement = `const clearAllTypes = () => setSelectedTypes([])

  const openViewModal = (e, sr) => {
    e.stopPropagation()
    setSelectedRequestForModal(sr)
    setModalStatus(sr.status || 'Open')
    setModalDescription(sr.description || sr.complaintDetails || sr.subject || '')
  }

  const handleSaveModal = async (e) => {
    e.preventDefault()
    if (!selectedRequestForModal) return
    setIsSavingModal(true)
    try {
      await supportRequestApi.updateSupportRequest(selectedRequestForModal.id || selectedRequestForModal._id, {
        status: modalStatus,
        description: modalDescription,
        subject: selectedRequestForModal.subject || selectedRequestForModal.title || 'Update',
      })
      await refreshSupportRequests()
      setSelectedRequestForModal(null)
    } catch (err) {
      console.error('Failed to update support request:', err)
      alert(err.response?.data?.message || 'Failed to update support request.')
    } finally {
      setIsSavingModal(false)
    }
  }`;

if (content.includes(handlersAnchor)) {
  content = content.replace(handlersAnchor, handlersReplacement);
}

// 3. Add Actions column th
const thAnchor = `<th>Date & Age</th>\n                </tr>`;
const thReplacement = `<th>Date & Age</th>\n                  {isSupportUser && <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>}\n                </tr>`;

if (content.includes(thAnchor)) {
  content = content.replace(thAnchor, thReplacement);
}

// 4. Add Actions td cell
const tdAnchor = `</div>\n                      </td>\n                    </tr>\n                  )`;
const tdReplacement = `</div>\n                      </td>\n                      {isSupportUser && (\n                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>\n                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>\n                            <button\n                              type="button"\n                              onClick={(e) => openViewModal(e, supportRequest)}\n                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}\n                            >\n                              View\n                            </button>\n                            <button\n                              type="button"\n                              onClick={(e) => handleCloseRequest(e, supportRequest.id || supportRequest._id)}\n                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}\n                            >\n                              Close\n                            </button>\n                          </div>\n                        </td>\n                      )}\n                    </tr>\n                  )`;

if (content.includes(tdAnchor)) {
  content = content.replace(tdAnchor, tdReplacement);
}

// 5. Add Modal JSX at bottom before </div>\n  )
const endAnchor = `</section>\n    </div>\n  )`;
const modalJsx = `{selectedRequestForModal && (
        <div className="arm-overlay" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0284c7' }}>Support Request Details</span>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedRequestForModal.srNumber || \`SR-\${String(selectedRequestForModal.id).slice(-4).toUpperCase()}\`}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedRequestForModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#334155' }}>
                <strong>Customer / Account:</strong> {selectedRequestForModal.customerName || selectedRequestForModal.companyName || selectedRequestForModal.accountName || '-'}<br />
                <strong>Type:</strong> {formatSupportRequestType(selectedRequestForModal.requestType)}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status *</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                >
                  <option value="Open">Open</option>
                  <option value="Attending">Attending</option>
                  <option value="On site">On site</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Postponed">Postponed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Description / Remarks</label>
                <textarea
                  rows={4}
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                  placeholder="Enter description or remarks..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRequestForModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingModal}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSavingModal ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </section>
    </div>
  )`;

if (content.includes(endAnchor)) {
  content = content.replace(endAnchor, modalJsx);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated SupportRequestView.jsx');
