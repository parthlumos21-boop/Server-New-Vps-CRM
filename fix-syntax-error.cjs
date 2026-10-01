const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// Wipe out the leftover string fragments that caused the syntax error
code = code.replace(/-\$\{num\}`;[\s\S]*?return num;\s*\}/g, "");
fs.writeFileSync(file, code);
console.log('Successfully cleaned up the syntax error!');
