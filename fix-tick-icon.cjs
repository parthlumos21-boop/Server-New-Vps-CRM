const fs = require('fs');
const file = 'src/pages/admin/reminders/AdminRemindersPage.css';
if (fs.existsSync(file)) {
  let code = fs.readFileSync(file, 'utf8');
  
  const cssFix = `
/* FIX FOR TICK ICON DISPLAY */
.admin-my-reminders-icon-action-check,
.active-reminders-item-action-close {
  background: linear-gradient(180deg, #2ea043 0%, #238636 100%) !important;
}
.admin-my-reminders-icon-action-check svg,
.active-reminders-item-action-close svg {
  display: block !important;
  fill: #ffffff !important;
  width: 14px !important;
  height: 14px !important;
  visibility: visible !important;
  opacity: 1 !important;
}
`;
  if (!code.includes('/* FIX FOR TICK ICON DISPLAY */')) {
    fs.appendFileSync(file, '\n' + cssFix);
    console.log('Successfully applied the tick icon fix!');
  } else {
    console.log('The fix was already applied.');
  }
} else {
  console.log('Error: Could not find AdminRemindersPage.css');
}
