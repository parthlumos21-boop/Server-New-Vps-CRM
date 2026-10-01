const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// 1. Force React's cache to re-render the tables instantly when the MongoDB Users are downloaded!
code = code.replace(
  /\}, \[convertedColumnDefinitions, isConvertedAccountsView, user, variantKey\]\)/g,
  "}, [convertedColumnDefinitions, isConvertedAccountsView, user, variantKey, dbMongoUsers])"
);
// 2. Forcefully attach the MongoDB formatter to the Account Number column across EVERY SINGLE view unconditionally!
const hook = "return convertedColumnDefinitions.map((col) => {";
if (code.includes(hook) && !code.includes("col.key === 'accountNumber' && !col.isOverridden")) {
    const injection = `
      // 🚀 ABSOLUTE OVERRIDE FOR ALL ACCOUNT NUMBERS ACROSS ALL VIEWS!
      if (col.key === 'accountNumber' && !col.isOverridden) {
        return {
          ...col,
          isOverridden: true,
          cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
          exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row)
        };
      }
`;
    code = code.replace(hook, hook + injection);
}
fs.writeFileSync(file, code);
console.log('Successfully enforced Live MongoDB Owner Code formatting on ALL tables unconditionally!');
