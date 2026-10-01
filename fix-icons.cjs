const fs = require('fs');
const file = 'src/pages/admin/reminders/AdminRemindersPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
let updated = false;
// Force the Plus (Add) icon to be white
if (code.includes('<FaPlus />')) {
    code = code.replace(/<FaPlus \/>/g, '<FaPlus style={{ color: "#fff" }} />');
    updated = true;
}
// Force the Redo (Reschedule) icon to be white
if (code.includes('<FaRedo />')) {
    code = code.replace(/<FaRedo \/>/g, '<FaRedo style={{ color: "#fff" }} />');
    updated = true;
}
if (updated) {
  fs.writeFileSync(file, code);
  console.log('Successfully updated missing icons to be visible!');
} else {
  console.log('Icons already updated or not found.');
}
