const fs = require('fs');
const file = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\r\n/g, '\n');
content = content.replace('  FaFilter,\n  FaCalendarAlt,\n', '  FaFilter,\n');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed AdminPanel.jsx CRLF');
