const fs = require('fs');
const file = 'src/pages/admin/reminders/AdminRemindersPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
// Replace the entire buttons block to guarantee the exact order and colors
const regex = /<div className="active-reminders-item-actions" aria-label="Reminder actions">[\s\S]*?<\/div>\s*<\/article>/;
const newButtons = `<div className="active-reminders-item-actions" aria-label="Reminder actions">
                                <button
                                  type="button"
                                  className="active-reminders-item-action active-reminders-item-action-add"
                                  title="Add reminder"
                                  aria-label="Add reminder"
                                  onClick={() => handleUpdateReminderDate(reminder, 'Add')}
                                >
                                  <FaPlus style={{ color: '#fff' }} />
                                </button>
                                <button
                                  type="button"
                                  className="active-reminders-item-action active-reminders-item-action-close"
                                  title="Close reminder"
                                  aria-label="Close reminder"
                                  onClick={() => handleCloseReminder(reminder)}
                                  style={{ backgroundColor: '#b91c1c', borderColor: '#b91c1c' }}
                                >
                                  <FaCheck style={{ color: '#fff' }} />
                                </button>
                                <button
                                  type="button"
                                  className="active-reminders-item-action active-reminders-item-action-reschedule"
                                  title="Reschedule reminder"
                                  aria-label="Reschedule reminder"
                                  onClick={() => handleUpdateReminderDate(reminder, 'Reschedule')}
                                >
                                  <FaRedo style={{ color: '#fff' }} />
                                </button>
                              </div>
                            </article>`;
if (code.match(regex)) {
  code = code.replace(regex, newButtons);
  fs.writeFileSync(file, code);
  console.log('Successfully reordered buttons and colored the tick mark red/white!');
} else {
  console.log('Could not find the button group to replace.');
}
