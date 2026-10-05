const fs = require('fs');

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  const textBlock = `          <div className="md-communication-content">
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.75rem 0' }}>
              Track all recent calls, general remarks, feedback notes, and discussion threads across Accounts and Deals.
            </p>`;

  const textBlockReplacement = `          <div className="md-communication-content">`;

  const userTextBlock = `        <div className="ud-card-body" style={{ padding: '1.25rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
            Track all recent calls, general remarks, feedback notes, and discussion threads across Accounts and Deals.
          </p>`;

  const userTextBlockReplacement = `        <div className="ud-card-body" style={{ padding: '1.25rem' }}>`;

  let modified = false;
  if (content.includes(textBlock)) {
    content = content.replace(textBlock, textBlockReplacement);
    modified = true;
  }
  if (content.includes(userTextBlock)) {
    content = content.replace(userTextBlock, userTextBlockReplacement);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned Communication text in ${filePath}`);
  } else {
    console.log(`Text block not found in ${filePath}`);
  }
}

cleanFile('c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/dashboard/Dashboard.jsx');
cleanFile('c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/user/UserDashboardPage.jsx');
