const fs = require('fs');
const file = 'src/pages/admin/reminders/AdminRemindersPage.css';
if (!fs.existsSync(file)) {
  console.log('Error: CSS File not found!');
  process.exit(1);
}
let css = fs.readFileSync(file, 'utf8');
// Replace the exact blue gradient for the tick button with the solid red color
if (css.includes('#3ba7dd')) {
  css = css.replace(
    /background:\s*linear-gradient\(180deg,\s*#3ba7dd\s*0%,\s*#227cb5\s*100%\);/g, 
    'background: #b91c1c;'
  );
  fs.writeFileSync(file, css);
  console.log('Successfully changed the tick button background from blue to red!');
} else {
  console.log('Blue background already replaced or not found.');
}
