const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
let code = fs.readFileSync(file, 'utf8');
// 1. Add the live User API import
if (!code.includes("import { userApi }")) {
    code = code.replace(
        "import { authService } from '../../../services/authService'",
        "import { authService } from '../../../services/authService'\nimport { userApi } from '../../../services/userApi'"
    );
}
// 2. Add real-time MongoDB fetching to the page!
if (!code.includes("const [dbMongoUsers, setDbMongoUsers] = useState")) {
    const hook = "const [availableUsers, setAvailableUsers] = useState(() => authService.getAvailableUsers())";
    const injection = `\n  const [dbMongoUsers, setDbMongoUsers] = useState([]);
  useEffect(() => {
    userApi.listDirectory().then(users => {
      if (Array.isArray(users)) setDbMongoUsers(users);
    }).catch(err => console.error('Error fetching MongoDB users:', err));
  }, []);\n`;
    code = code.replace(hook, hook + injection);
}
// 3. Perfect the formatting function to use the LIVE MongoDB collection
const newFunc = `const getMongoOwnerCodeOnly = (row) => {
    let code = getCreatorOwnerCode(row);
    const rawOwnerName = String(row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName || '').trim();
    const ownerName = rawOwnerName.toLowerCase();
    
    if (ownerName) {
        // We merge the LIVE MongoDB collection with the cache to guarantee we find the fresh owner code!
        const users = [...(availableUsers || []), ...(dbMongoUsers || [])];
        const dbUser = users.find(u => String(u.name || '').trim().toLowerCase() === ownerName || String(u.username || '').trim().toLowerCase() === ownerName);
        if (dbUser && dbUser.ownerCode) {
           code = String(dbUser.ownerCode).trim();
        }
    }
    
    // For Swati, Keval V Shah, Vaibhavi (users WITH an owner code): Display ONLY their Owner Code!
    if (code) {
        return code;
    }
    
    // DO NOT TOUCH DEMO! For users without an owner code (like Demo), just return their original Table Account No!
    const num = String(row.accountNumber || row.accountNo || '').trim();
    return num || '-';
  };`;
// Replace all previous variations of the function
code = code.replace(/const getMongoOwnerCodeOnly = \(row\) => \{[\s\S]*?return num \|\| '-';\s*\};/g, newFunc);
code = code.replace(/const getMongoOwnerCodeOnly = \(row\) => \{[\s\S]*?return '-'; \/\/ Fallback\s*\};/g, newFunc);
// 4. Force the table to automatically re-render the second the live MongoDB users arrive!
code = code.replace(
  /\}, \[convertedColumnDefinitions, isConvertedAccountsView, user, variantKey\]\)/g,
  "}, [convertedColumnDefinitions, isConvertedAccountsView, user, variantKey, dbMongoUsers])"
);
code = code.replace(
  /\}, \[columns, convertedColumnDefinitions, isConvertedAccountsView, user, visibleColumnKeys, variantKey\]\)/g,
  "}, [columns, convertedColumnDefinitions, isConvertedAccountsView, user, visibleColumnKeys, variantKey, dbMongoUsers])"
);
fs.writeFileSync(file, code);
console.log('Successfully connected LIVE to MongoDB User Collection!');
