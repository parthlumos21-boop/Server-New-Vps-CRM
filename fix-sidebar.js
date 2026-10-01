const fs = require('fs');
const file = 'src/components/layout/Sidebar.jsx';
let code = fs.readFileSync(file, 'utf8');
// Use indexOf instead of exclamation mark to avoid bash errors
if (code.indexOf('LUMOS_USERS = [') === -1) {
  code = code.replace(
    /const isLumos = company\.includes\('lumos'\)/,
    'const LUMOS_USERS = ["sahana prasenjit", "kuldeep nayi", "manish patel", "vishal vandra", "amiha purohit", "vihal memaria", "jaydip chavda", "dhara", "demo"];\n  const isLumos = company.includes("lumos") || LUMOS_USERS.includes(normalizedUser) || normalizedUser.includes("@lumossolution.com") || normalizedUser.includes("@gmail.com")'
  );
  fs.writeFileSync(file, code);
  console.log('Sidebar.jsx updated successfully!');
} else {
  console.log('Sidebar.jsx was already updated!');
}
