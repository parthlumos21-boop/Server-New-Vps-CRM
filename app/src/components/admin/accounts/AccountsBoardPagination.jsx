import React from 'react'

const MAX_VISIBLE_PAGES = 3

const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const half = Math.floor(MAX_VISIBLE_PAGES / 2)
  let start = Math.max(1, currentPage - half)
  const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1)
  start = Math.max(1, end - MAX_VISIBLE_PAGES + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

const AccountsBoardPagination = ({
  currentPage,
  totalPages,
  pageStart,
  pageEnd,
  totalItems,
  onPageChange,
}) => {
  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <div className="admin-accounts-pagination">
      <div className="admin-accounts-pagination-left">
        <span className="admin-accounts-pagination-rows-indicator">
          {totalItems > 0 ? `${pageStart}-${pageEnd}` : '0'}
        </span>
        <span className="admin-accounts-pagination-total">
          Total records: {totalItems}
        </span>
      </div>

      <div className="admin-accounts-pagination-pages">
        <button
          type="button"
          className="admin-accounts-pag-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          prev
        </button>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`admin-accounts-pag-btn ${page === currentPage ? 'admin-accounts-pag-btn--active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="admin-accounts-pag-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          next
        </button>
      </div>
    </div>
  )
}

export default AccountsBoardPagination
