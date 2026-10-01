const fs = require('fs');
const file = 'src/pages/admin/reminders/AdminRemindersPage.jsx';
if (fs.existsSync(file)) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Look for the plain text "Close" button for My Reminders
  const searchPattern = /<button\s+type="button"\s+className="admin-my-reminders-item-action"\s+onClick=\{\(\) => handleCloseReminder\(reminder\)\}\s*>\s*Close\s*<\/button>/g;
  
  // Replace it with the exact same tick icon button used for Notifications
  const replacement = `<button
                      type="button"
                      className="admin-my-reminders-icon-action admin-my-reminders-icon-action-check"
                      title="Mark as done"
                      aria-label="Mark reminder as done"
                      onClick={() => handleCloseReminder(reminder)}
                    >
                      <FaCheck />
                    </button>`;
  if (searchPattern.test(code)) {
    code = code.replace(searchPattern, replacement);
    fs.writeFileSync(file, code);
    console.log('Successfully updated the My Reminders tab to use the tick icon!');
  } else {
    console.log('The fix was already applied or the button could not be found.');
  }
} else {
  console.log('Error: Could not find AdminRemindersPage.jsx');
}
