const fs = require('fs');
const path = require('path');

const indexCssPath = path.join(__dirname, 'src', 'styles', 'index.css');
const tableCssPath = path.join(__dirname, 'src', 'components', 'common', 'Table.css');

let indexCss = fs.readFileSync(indexCssPath, 'utf-8');

// Unify dark mode backgrounds to a "lightly black" premium dark grey instead of pitch black
indexCss = indexCss.replace(/--surface-app:\s*#000000;/gi, '--surface-app: #0f1115;');
indexCss = indexCss.replace(/--surface-card:\s*#0a0a0a;/gi, '--surface-card: #16181d;');
indexCss = indexCss.replace(/--surface-app:\s*#0d141b;/gi, '--surface-app: #0f1115;');
indexCss = indexCss.replace(/--surface-card:\s*#111c25;/gi, '--surface-card: #16181d;');

// Fix button colors in night theme
if (!indexCss.includes('[data-theme="dark"] .btn-primary {')) {
  indexCss += `\n\n/* Custom Night Theme Buttons */\n[data-theme="dark"] .btn-primary, [data-theme="dark"] button.btn-primary {\n  background: linear-gradient(180deg, #4f46e5 0%, #4338ca 100%) !important;\n  color: #ffffff !important;\n  border-color: #3730a3 !important;\n  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4) !important;\n}\n\n[data-theme="dark"] .btn-primary:hover {\n  background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%) !important;\n}\n`;
}

fs.writeFileSync(indexCssPath, indexCss);
console.log('Updated index.css');

let tableCss = fs.readFileSync(tableCssPath, 'utf-8');

// Ensure tables actually change in dark mode by using higher specificity
tableCss = tableCss.replace(/\[data-theme="dark"\] \.table-header-cell \{/g, '[data-theme="dark"] table th, [data-theme="dark"] .table-header-cell {');
tableCss = tableCss.replace(/\[data-theme="dark"\] \.table-striped \.table-row:nth-child\(odd\)/g, '[data-theme="dark"] table tbody tr:nth-child(odd), [data-theme="dark"] .table-striped .table-row:nth-child(odd)');
tableCss = tableCss.replace(/\[data-theme="dark"\] \.table-striped \.table-row:nth-child\(even\)/g, '[data-theme="dark"] table tbody tr:nth-child(even), [data-theme="dark"] .table-striped .table-row:nth-child(even)');
tableCss = tableCss.replace(/\[data-theme="dark"\] \.table-cell \{/g, '[data-theme="dark"] table td, [data-theme="dark"] .table-cell {');

// Force background on td/th
tableCss = tableCss.replace(/background:\s*transparent\s*!important;/g, 'background: rgba(255,255,255,0.02) !important;');

fs.writeFileSync(tableCssPath, tableCss);
console.log('Updated Table.css');
