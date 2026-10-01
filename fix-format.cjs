const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
let code = fs.readFileSync(file, 'utf8');
const newFunc = `const getMongoOwnerCodeOnly = (row) => {
    let code = getCreatorOwnerCode(row);
    const ownerName = String(row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName || '').trim().toLowerCase();
    
    // Fetch exact Owner Code from the pre-loaded MongoDB User cache
    if (ownerName) {
        const users = availableUsers || [];
        const dbUser = users.find(u => String(u.name || '').trim().toLowerCase() === ownerName || String(u.username || '').trim().toLowerCase() === ownerName);
        if (dbUser && dbUser.ownerCode) {
           code = String(dbUser.ownerCode).trim();
        }
    }
    
    // STRICT RULE: ONLY return the owner code. NEVER return the Account Number.
    // If the user has no code (like "Demo"), display a blank dash.
    return code || '-';
  };`;
// Replace all previous versions with this incredibly strict logic
code = code.replace(/const getMongoOwnerCodeOnly = \(row\) => \{[\s\S]*?return num;\s*\};/g, newFunc);
code = code.replace(/const getMongoOwnerCodeOnly = \(row\) => \{[\s\S]*?return num \|\| '-';\s*\};/g, newFunc);
code = code.replace(/const getMongoOwnerCodeOnly = \(row\) => \{[\s\S]*?return cleanNum;\s*\};/g, newFunc);
code = code.replace(/const getMongoOwnerCodeOnly = \(row\) => \{[\s\S]*?return code \|\| '-';[\s\S]*?\};/g, newFunc);
fs.writeFileSync(file, code);
console.log('Account formatting completely perfected! Strictly displaying Owner Code ONLY!');
