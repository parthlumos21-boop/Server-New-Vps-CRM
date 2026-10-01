import React from 'react'
import { formatCustomViewFieldValue } from '../../../features/adminAccounts/customViews/customViewConfig'

const CustomViewGrid = ({
  groups,
  columns,
  onAccountOpen,
  emptyMessage,
}) => {
  if (groups.length === 0) {
    return (
      <div className="custom-admin-view-grid-empty">
        {emptyMessage}
      </div>
    )
  }

  const secondaryFields = columns.filter((column) => column.key !== 'accountNumber')

  return (
    <div className="custom-admin-view-grid-groups">
      {groups.map((group) => (
        <section key={group.key} className="custom-admin-view-grid-group">
          <div className="custom-admin-view-grid-group-header">
            <span>{group.label}</span>
            <strong>({group.count})</strong>
          </div>

          <div className="custom-admin-view-grid-group-body">
            {group.records.map((record) => {
              const leadLetter = String(record.name || record.accountNumber || 'A').trim().charAt(0).toUpperCase() || 'A'

              return (
                <article
                  key={record.id}
                  className="custom-admin-view-card"
                  onClick={() => onAccountOpen(record)}
                >
                  <div className="custom-admin-view-card-top">
                    <div className="custom-admin-view-card-avatar">{leadLetter}</div>
                    <div className="custom-admin-view-card-main">
                      <button
                        type="button"
                        className="custom-admin-view-card-account-number"
                        onClick={(event) => {
                          event.stopPropagation()
                          onAccountOpen(record)
                        }}
                      >
                        {record.accountNumber}
                      </button>
                      <h3>{record.name}</h3>
                    </div>
                  </div>

                  <div className="custom-admin-view-card-body">
                    {secondaryFields.map((column) => (
                      <div key={`${record.id}-${column.key}`} className="custom-admin-view-card-row">
                        <span>{column.label}</span>
                        <strong>{formatCustomViewFieldValue(column.key, record)}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export default CustomViewGrid
