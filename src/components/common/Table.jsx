import React from 'react'
import './Table.css'

const Table = ({ 
  columns = [], 
  data = [], 
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  striped = true,
  hoverable = true,
  className = ''
}) => {
  const classes = [
    'table-container',
    striped && 'table-striped',
    hoverable && 'table-hoverable',
    className
  ].filter(Boolean).join(' ')

  if (loading) {
    return (
      <div className={classes}>
        <div className="table-loading">Loading...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={classes}>
        <div className="table-empty">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={classes} style={{ '--table-column-count': Math.max(columns.length, 1) }}>
      <table className="table">
        <thead className="table-header">
          <tr>
            {columns.map((column, index) => (
              <th 
                key={index} 
                className="table-header-cell"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className="table-row"
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="table-cell">
                  {column.render 
                    ? column.render(row[column.key], row, rowIndex) 
                    : row[column.key] || '-'
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
