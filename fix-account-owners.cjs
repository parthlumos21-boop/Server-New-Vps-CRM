const fs = require('fs');
const file = 'src/pages/accounts/AddAccountWizard.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// Replace strict lowercase checks with a robust case-insensitive check
code = code.replace(
  /u\.company\s*===\s*['"`]swati['"`]/g, 
  "String(u.company || u.companyName || '').toLowerCase().includes('swati')"
);
code = code.replace(
  /u\.company\s*===\s*['"`]lumos['"`]/g, 
  "String(u.company || u.companyName || '').toLowerCase().includes('lumos')"
);
fs.writeFileSync(file, code);
console.log('Successfully fixed Account Owner dropdown logic!');
