const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// Fix the infinite loop where the function accidentally calls itself!
// We safely switch it back to calling the original fallback inside the function.
code = code.replace(
  /let code = getMongoOwnerCodeOnly\(row\);/g,
  "let code = getCreatorOwnerCode(row);"
);
fs.writeFileSync(file, code);
console.log('Infinite loop successfully resolved!');
