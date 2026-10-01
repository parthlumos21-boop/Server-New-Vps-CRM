const fs = require('fs');
const file = 'src/pages/admin/support-requests/AddSupportRequest.css';
let code = fs.readFileSync(file, 'utf8');
const newCSS = `
/* Apply Red Theme #dc2626 to Customer Search Modal and Button */
/* Make the Search Icon button red */
.sr-new-customer-search-btn.btn-red-theme,
.sr-new-customer-search-btn {
  background: #dc2626 !important;
  color: #ffffff !important;
  border: 1px solid #dc2626 !important;
}
.sr-new-customer-search-btn:hover {
  background: #b91c1c !important; /* Slightly darker red on hover */
  border-color: #b91c1c !important;
}
/* Make the Customer Popup Header red */
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
/* Add a red accent to the instruction note for better UI balance */
.sr-customer-modal-note {
  border-left: 4px solid #dc2626 !important;
}
`;
if (!code.includes('#dc2626') || !code.includes('.sr-customer-modal-header {\\n  background-color: #dc2626')) {
    fs.appendFileSync(file, newCSS);
    console.log('Successfully injected #dc2626 styling for Customer Modal and Search Button!');
} else {
    console.log('Red styling already exists.');
}
