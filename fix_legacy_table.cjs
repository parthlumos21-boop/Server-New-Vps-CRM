const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'pages', 'admin', 'support-requests', 'SupportRequestAdmin.css');
let css = fs.readFileSync(cssPath, 'utf-8');

// Midnight indigo for legacy tables
css = css.replace(/\[data-theme="dark"\] \.support-request-legacy-table th \{[\s\S]*?\}/g, 
`[data-theme="dark"] .support-request-legacy-table th {
  background: linear-gradient(180deg, #1e1b4b 0%, #17153b 100%) !important;
  color: #22d3ee !important;
  border-color: transparent !important;
}`);

css = css.replace(/\[data-theme="dark"\] \.support-request-legacy-page--excel-like \.support-request-legacy-table th \{[\s\S]*?\}/g, 
`[data-theme="dark"] .support-request-legacy-page--excel-like .support-request-legacy-table th {
  background: linear-gradient(180deg, #1e1b4b 0%, #17153b 100%) !important;
  color: #22d3ee !important;
  border-color: transparent !important;
}`);

css = css.replace(/\[data-theme="dark"\] \.support-request-legacy-table tbody tr:not\(\.support-request-legacy-filter-row\) td \{[\s\S]*?\}/g, 
`[data-theme="dark"] .support-request-legacy-table tbody tr:not(.support-request-legacy-filter-row) td {
  background: rgba(255, 255, 255, 0.02) !important;
  color: var(--text-primary) !important;
  border-color: transparent !important;
}`);

css = css.replace(/\[data-theme="dark"\] \.support-request-legacy-page--excel-like \.support-request-legacy-table tbody tr:not\(\.support-request-legacy-filter-row\) td \{[\s\S]*?\}/g, 
`[data-theme="dark"] .support-request-legacy-page--excel-like .support-request-legacy-table tbody tr:not(.support-request-legacy-filter-row) td {
  background: rgba(255, 255, 255, 0.02) !important;
  color: var(--text-primary) !important;
  border-color: transparent !important;
}`);

fs.writeFileSync(cssPath, css);
console.log('Legacy table overrides patched.');
