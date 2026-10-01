const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// Switch from the buggy empty array to the perfectly pre-loaded MongoDB user cache
code = code.replace(/dbMongoUsers\.length/g, "availableUsers.length");
code = code.replace(/dbMongoUsers\.find/g, "availableUsers.find");
fs.writeFileSync(file, code);
console.log('Successfully switched to pre-loaded MongoDB User Cache!');
