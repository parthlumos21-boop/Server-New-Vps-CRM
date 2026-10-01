import React, { useEffect, useState } from 'react'
import { remarkApi } from '../../services/remarkApi'
import './RemarksTimeline.css'

const TYPE_LABELS = {
  feedback: 'FEEDBACK',
  general: 'GENERAL',
  call_log: 'Call Log',
  email: 'Email',
  whatsapp: 'Whatsapp',
}

const formatRemarkDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const RemarksTimeline = ({ accountId, refreshKey = 0 }) => {
  const [remarks, setRemarks] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!accountId) {
      setRemarks([])
      return undefined
    }

    let isMounted = true
    setIsLoading(true)

    remarkApi
      .getAccountRemarks(accountId)
      .then((result) => {
        if (isMounted) setRemarks(result.remarks)
      })
      .catch(() => {
        if (isMounted) setRemarks([])
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accountId, refreshKey])

  return (
    <section className="remarks-timeline">
      <div className="remarks-timeline-header">
        <h2>Account History / Timeline</h2>
      </div>

      {isLoading ? (
        <p className="remarks-timeline-empty">Loading remarks...</p>
      ) : remarks.length === 0 ? (
        <p className="remarks-timeline-empty">No remarks added yet.</p>
      ) : (
        <div className="remarks-timeline-list">
          {remarks.map((remark) => (
            <article key={remark.id} className="remarks-timeline-item">
              <div className="remarks-timeline-item-meta">
                <span className="remarks-timeline-type">{TYPE_LABELS[remark.category] || remark.category}</span>
                <span>{formatRemarkDate(remark.createdAt)}</span>
                {remark.createdByName ? <span>{remark.createdByName}</span> : null}
              </div>
              <p>{remark.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default RemarksTimeline
