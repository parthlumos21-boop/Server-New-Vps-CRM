const fs = require('fs');

// 1. Header.jsx
let headerPath = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/components/layout/Header.jsx';
let headerContent = fs.readFileSync(headerPath, 'utf8').replace(/\r\n/g, '\n');

headerContent = headerContent.replace(
  `const handleOpenReminderPanel = () => {\n    closeHeaderPanels()\n    setAddReminderOpen(true)\n  }`,
  `const handleOpenReminderPanel = () => {\n    closeHeaderPanels()\n    navigate(isAdmin ? '/admin/reminders/my' : '/reminders/my')\n  }`
);

headerContent = headerContent.replace(
  `navigate(isAdmin ? '/admin/reminders/my' : '/reminders')`,
  `navigate(isAdmin ? '/admin/reminders/my' : '/reminders/my')`
);

fs.writeFileSync(headerPath, headerContent, 'utf8');
console.log('Updated Header.jsx notification icon navigation');

// 2. Dashboard.jsx
let dashPath = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/dashboard/Dashboard.jsx';
let dashContent = fs.readFileSync(dashPath, 'utf8').replace(/\r\n/g, '\n');

dashContent = dashContent.replace(
  `<button className="md-icon-btn-round" data-count="3">`,
  `<button className="md-icon-btn-round" data-count="3" onClick={() => navigate(user?.role === 'admin' ? '/admin/reminders/my' : '/reminders/my')} title="Notifications">`
);

fs.writeFileSync(dashPath, dashContent, 'utf8');
console.log('Updated Dashboard.jsx notification icon navigation');

// 3. UserDashboardPage.jsx
let userDashPath = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/user/UserDashboardPage.jsx';
let userDashContent = fs.readFileSync(userDashPath, 'utf8').replace(/\r\n/g, '\n');

userDashContent = userDashContent.replace(
  `<button className="ud-icon-btn-round" data-count="3">`,
  `<button className="ud-icon-btn-round" data-count="3" onClick={() => navigate(user?.role === 'admin' ? '/admin/reminders/my' : '/reminders/my')} title="Notifications">`
);

fs.writeFileSync(userDashPath, userDashContent, 'utf8');
console.log('Updated UserDashboardPage.jsx notification icon navigation');
