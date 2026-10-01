const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
let code = fs.readFileSync(file, 'utf8');
// Inject a secure filter into the table's row generation logic to perfectly hide Dummy/Demo accounts
if (!code.includes("o !== 'demo' && o !== 'dummy'")) {
  code = code.replace(
    /\.filter\(matchesConvertedFilterRules\)/g,
    `.filter(matchesConvertedFilterRules)
      .filter((row) => {
        // Find the owner of this row
        const o = String(row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName || '').trim().toLowerCase();
        
        // Hide it completely if it's a demo or dummy account
        return o !== 'demo' && o !== 'dummy';
      })`
  );
  fs.writeFileSync(file, code);
  console.log('Successfully hid all Demo/Dummy accounts from the Accounts Table UI!');
} else {
  console.log('Dummy accounts are already hidden.');
}
