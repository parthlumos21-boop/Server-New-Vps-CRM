const fs = require('fs');
const file = 'src/pages/admin/support-requests/AddSupportRequest.css';
let code = fs.readFileSync(file, 'utf8');
const newCSS = `
/* --- FINAL RED THEME #dc2626 --- */
/* 1. Search Icon Button (Solid Red) */
.sr-new-customer-search-btn.btn-red-theme,
.sr-new-customer-search-btn {
  background: #dc2626 !important;
  color: #ffffff !important;
  border: 1px solid #dc2626 !important;
}
.sr-new-customer-search-btn:hover {
  background: #b91c1c !important;
  border-color: #b91c1c !important;
}
/* 2. Customer Popup Header (Solid Red) */
.sr-customer-modal-header {
  background-color: #dc2626 !important;
  color: #ffffff !important;
  border-bottom: none !important;
}
.sr-customer-modal-header h2,
.sr-customer-modal-header h3,
.sr-customer-modal-header .sr-customer-modal-close {
  color: #ffffff !important;
}
.sr-customer-modal-header .sr-customer-modal-close:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
}
.sr-customer-modal-note {
  border-left: 4px solid #dc2626 !important;
}
/* 3. Table Headers (Border Only!) */
div.sr-customer-table-shell table.sr-customer-table thead th {
  background: var(--surface-card) !important; /* Removes the solid color */
  border: 1px solid #dc2626 !important;       /* Red Border Only */
  color: #dc2626 !important;                  /* Red Text to match */
}
/* 4. Pagination (Border Only until active/hovered) */
div.sr-customer-modal-pagination button {
  background: transparent !important;
  color: #dc2626 !important;
  border: 1px solid #dc2626 !important;
}
div.sr-customer-modal-pagination button.is-active,
div.sr-customer-modal-pagination button:hover:not(:disabled) {
  background: #dc2626 !important;
  color: #ffffff !important;
}
`;
fs.appendFileSync(file, newCSS);
console.log('Successfully injected the final #dc2626 styling with Border-Only Table Headers!');
