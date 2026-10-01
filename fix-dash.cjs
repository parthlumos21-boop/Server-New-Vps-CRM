const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
let code = fs.readFileSync(file, 'utf8');
const newFunc = `const getMongoOwnerCodeOnly = (row) => {
    let code = getCreatorOwnerCode(row);
    const rawOwnerName = String(row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName || '').trim();
    const ownerName = rawOwnerName.toLowerCase();
    
    if (ownerName) {
        const users = availableUsers || [];
        const dbUser = users.find(u => String(u.name || '').trim().toLowerCase() === ownerName || String(u.username || '').trim().toLowerCase() === ownerName);
        if (dbUser && dbUser.ownerCode) {
           code = String(dbUser.ownerCode).trim();
        }
    }
    
    // COMPLETELY REMOVED THE DASH!
    // If the user has an owner code, return it.
    // If the user does not have an owner code, return a COMPLETELY BLANK space (no dashes, no ACC00002).
    return code || '';
  };`;
// Replace the old function that was returning the dash
code = code.replace(/const getMongoOwnerCodeOnly = \(row\) => \{[\s\S]*?return code \|\| '-';\s*\};/g, newFunc);
fs.writeFileSync(file, code);
console.log('The dash has been completely removed!');
