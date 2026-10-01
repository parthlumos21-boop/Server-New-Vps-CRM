const fs = require('fs');
const file = 'src/pages/admin/users/AdminUserManagementPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// Use precise regular expressions to remove the Mobile and Last Login sections from the cards
const originalLength = code.length;
// Remove Mobile card row
code = code.replace(/<div className="manage-users-card-row">\s*<dt>Mobile<\/dt>[\s\S]*?<\/div>/g, '');
// Remove Last Login card row
code = code.replace(/<div className="manage-users-card-row">\s*<dt>Last Login<\/dt>[\s\S]*?<\/div>/g, '');
// Optionally, remove Last Login from the Insights table view if it's there
code = code.replace(/\s*\{\s*key:\s*'lastLogin'.*\},/g, '');
if (code.length < originalLength) {
  fs.writeFileSync(file, code);
  console.log('Successfully removed Mobile and Last Login fields!');
} else {
  console.log('Fields already removed or not found.');
}
