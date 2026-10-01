const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// 1. Ensure crmUserDirectory is imported to allow User Collection lookups
if (!code.includes('getCrmOwnerCode')) {
  code = code.replace(
    /import \{ ACCOUNT_OWNER_OPTIONS \}.*?;?/,
    "import { ACCOUNT_OWNER_OPTIONS } from '../../../features/accounts/config/accountDropdownOptions';\nimport { getCrmOwnerCode } from '../../../features/users/crmUserDirectory';"
  );
}
// 2. Rewrite getCreatorOwnerCode to ALWAYS fetch ownerCode by matching the Account Owner Name against the user collection
const getCreatorStart = code.indexOf('const getCreatorOwnerCode = (row = {}) =>');
if (getCreatorStart !== -1) {
  const nextFunc = code.indexOf('const getCurrentUserOwnerCode', getCreatorStart);
  if (nextFunc !== -1) {
      const newGetCreator = `const getCreatorOwnerCode = (row = {}) => {
  const ownerName = row.accountOwnerDisplay || row.accountOwnerName || row.accountOwner || row.raw?.accountOwner || row.raw?.ownerName || row.raw?.assignedToName;
  if (ownerName && typeof getCrmOwnerCode === 'function') {
      const code = getCrmOwnerCode(ownerName);
      if (code) return String(code).trim();
  }
  const directCode = row.accountOwnerCode || row.raw?.accountOwnerCode || row.raw?.formData?.accountOwnerCode || row.ownerCode || row.raw?.ownerCode || row.raw?.formData?.ownerCode || row.employeeId || row.raw?.employeeId || row.raw?.formData?.employeeId;
  if (directCode && String(directCode).length <= 5) return String(directCode).trim();
  
  return '';
}
`;
      code = code.substring(0, getCreatorStart) + newGetCreator + code.substring(nextFunc);
  }
}
// 3. Remove "currentUserOwnerCode" from ALL formatters so it doesn't force the logged-in user's code!
code = code.replace(/currentUserOwnerCode \|\| getCreatorOwnerCode\(row\)/g, "getCreatorOwnerCode(row)");
// 4. Upgrade any original one-liner formatters to the full string-combination logic
code = code.replace(/cellFormatter:\s*\(_value,\s*row\)\s*=>\s*getCreatorOwnerCode\(row\)\s*\|\|\s*'-'/g, 
  `cellFormatter: (_value, row) => {
    const code = getCreatorOwnerCode(row);
    const num = row.accountNumber || row.accountNo || '';
    if (!num) return code || '-';
    if (code && code !== num && !String(num).startsWith(code)) return \`\${code}-\${num}\`;
    return num;
  }`);
code = code.replace(/exportFormatter:\s*\(_value,\s*row\)\s*=>\s*getCreatorOwnerCode\(row\)(?:\s*\|\|\s*row\.accountNumber\s*\|\|\s*'')?/g, 
  `exportFormatter: (_value, row) => {
    const code = getCreatorOwnerCode(row);
    const num = row.accountNumber || row.accountNo || '';
    if (!num) return code || '-';
    if (code && code !== num && !String(num).startsWith(code)) return \`\${code}-\${num}\`;
    return num;
  }`);
// 5. Force a GLOBAL OVERRIDE on accountNumber for all views (Weekly Reports, Group Accounts, etc.)
const hook = `if (filteredColumns.length === 0) {
      filteredColumns = sourceColumns
    }`;
if (code.includes(hook) && !code.includes('globalAccountNumberFix')) {
    const injection = `
    const globalAccountNumberFix = true;
    filteredColumns = filteredColumns.map((col) => {
      if (col.key === 'accountNumber') {
        return {
          ...col,
          cellFormatter: (_value, row) => {
            const code = getCreatorOwnerCode(row);
            const num = row.accountNumber || row.accountNo || '';
            if (!num) return code || '-';
            if (code && code !== num && !String(num).startsWith(code)) return \`\${code}-\${num}\`;
            return num;
          },
          exportFormatter: (_value, row) => {
            const code = getCreatorOwnerCode(row);
            const num = row.accountNumber || row.accountNo || '';
            if (!num) return code || '-';
            if (code && code !== num && !String(num).startsWith(code)) return \`\${code}-\${num}\`;
            return num;
          }
        };
      }
      return col;
    });
`;
    code = code.replace(hook, hook + injection);
}
fs.writeFileSync(file, code);
console.log('Successfully enforced User Collection Owner Code lookup (e.g. 1014) on all Account Numbers!');
