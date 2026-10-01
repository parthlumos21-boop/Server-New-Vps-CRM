const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// Find the exact broken line and remove the leftover "from '...'" text
code = code.replace(
  "import { getCrmOwnerCode } from '../../../features/users/crmUserDirectory'; from '../../../features/accounts/config/accountDropdownOptions'",
  "import { getCrmOwnerCode } from '../../../features/users/crmUserDirectory';"
);
// Fallback safety to wipe out any other leftover pieces
code = code.replace(/; from '.*?accountDropdownOptions'/g, "");
fs.writeFileSync(file, code);
console.log('Syntax error repaired successfully!');
