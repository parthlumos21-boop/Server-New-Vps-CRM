const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// 1. Ensure userApi is imported to fetch the live User Collection from MongoDB
if (!code.includes("import { userApi }")) {
    code = code.replace(
        /import \{ useAuth \} from '\.\.\/\.\.\/\.\.\/context\/AuthContext'/,
        "import { useAuth } from '../../../context/AuthContext';\nimport { userApi } from '../../../services/userApi';"
    );
}
// 2. Fetch the MongoDB User Collection immediately on page load
const hook1 = 'const { user } = useAuth()';
if (code.includes(hook1) && !code.includes('dbMongoUsers')) {
    const injection1 = `
  const [dbMongoUsers, setDbMongoUsers] = useState([]);
  useEffect(() => {
    userApi.listDirectory().then(users => {
      if (Array.isArray(users)) setDbMongoUsers(users);
    }).catch(err => console.error(err));
  }, []);`;
    code = code.replace(hook1, hook1 + injection1);
}
// 3. Create a strict function that ONLY checks the MongoDB User Collection and returns their exact ownerCode
const hook3 = 'const activeStageParam = searchParams.get(';
if (code.includes('const getMongoCombinedAccountNo = (row) => {')) {
    const start = code.indexOf('const getMongoCombinedAccountNo = (row) => {');
    const end = code.indexOf('};', start) + 2;
    code = code.substring(0, start) + code.substring(end);
}
if (code.includes(hook3) && !code.includes('getMongoOwnerCodeOnly')) {
    const injection3 = `
  const getMongoOwnerCodeOnly = (row) => {
    let code = getCreatorOwnerCode(row);
    const ownerName = String(row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName || '').trim().toLowerCase();
    
    // Check Live MongoDB User Collection!
    if (ownerName && dbMongoUsers.length > 0) {
        const dbUser = dbMongoUsers.find(u => String(u.name || '').trim().toLowerCase() === ownerName || String(u.username || '').trim().toLowerCase() === ownerName);
        if (dbUser && dbUser.ownerCode) {
           code = String(dbUser.ownerCode).trim();
        }
    }
    
    return code || '-'; // ONLY RETURN THE OWNER CODE!
  };
`;
    code = code.replace(hook3, injection3 + hook3);
}
// 4. Force EVERY formatter in the file to use our strict MongoDB checker
code = code.replace(/getMongoCombinedAccountNo\(row\)/g, "getMongoOwnerCodeOnly(row)");
code = code.replace(/getCreatorOwnerCode\(row\)/g, "getMongoOwnerCodeOnly(row)");
code = code.replace(/currentUserOwnerCode\s*\|\|\s*getMongoOwnerCodeOnly\(row\)/g, "getMongoOwnerCodeOnly(row)");
// Replace any old complex blocks with our strict function
code = code.replace(/cellFormatter:\s*\(_value,\s*row\)\s*=>\s*\{[\s\S]*?return[\s\S]*?\}/g, "cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row)");
code = code.replace(/exportFormatter:\s*\(_value,\s*row\)\s*=>\s*\{[\s\S]*?return[\s\S]*?\}/g, "exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row)");
code = code.replace(/cellFormatter:\s*\(_value,\s*row\)\s*=>\s*getMongoOwnerCodeOnly\(row\)\s*\|\|\s*'-'/g, "cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row)");
code = code.replace(/exportFormatter:\s*\(_value,\s*row\)\s*=>\s*getMongoOwnerCodeOnly\(row\)\s*\|\|\s*'-'/g, "exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row)");
// 5. Apply it universally to ALL tables (Weekly Reports, Groups, My Accounts, Search)
const hook2 = `if (filteredColumns.length === 0) {
      filteredColumns = sourceColumns
    }`;
if (code.includes('const globalMongoAccountNumberFix = true;')) {
    const start = code.indexOf('const globalMongoAccountNumberFix = true;');
    const end = code.indexOf(');', start) + 2; 
    code = code.substring(0, start) + code.substring(end);
}
if (code.includes(hook2) && !code.includes('const globalMongoOwnerCodeFix = true;')) {
    const injection2 = `
    const globalMongoOwnerCodeFix = true;
    filteredColumns = filteredColumns.map((col) => {
      if (col.key === 'accountNumber') {
        return {
          ...col,
          cellFormatter: (_value, row) => getMongoOwnerCodeOnly(row),
          exportFormatter: (_value, row) => getMongoOwnerCodeOnly(row)
        };
      }
      return col;
    });
`;
    code = code.replace(hook2, hook2 + injection2);
}
fs.writeFileSync(file, code);
console.log('Successfully injected Live MongoDB User Lookup to show ONLY the Owner Code!');
