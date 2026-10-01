const fs = require('fs');
const file = 'src/features/adminAccounts/adapters/normalizeAccountRecord.js';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// The exact line we need to replace
const targetLine = "const accountNumber = account.accountNumber || account.accountNo || account.account_no || account.raw?.accountNumber || account.raw?.accountNo || account.raw?.account_no || accountOwnerCode || ''";
// The new logic that prepends the Owner Code to the Account Number safely
const newLogic = `const rawAccNo = account.accountNumber || account.accountNo || account.account_no || account.raw?.accountNumber || account.raw?.accountNo || account.raw?.account_no || '';
  const accountNumber = (accountOwnerCode && rawAccNo && !rawAccNo.startsWith(accountOwnerCode)) 
    ? \`\${accountOwnerCode}-\${rawAccNo}\` 
    : rawAccNo || accountOwnerCode || '';`;
if (code.includes(targetLine)) {
    code = code.replace(targetLine, newLogic);
    fs.writeFileSync(file, code);
    console.log('Successfully added Owner Code into Account Number!');
} else {
    console.log('Could not find the target line. It may already be modified.');
}
