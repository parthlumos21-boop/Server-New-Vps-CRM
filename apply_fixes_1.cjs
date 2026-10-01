const fs = require('fs');
const path = require('path');

// 1. Hide reminder-details from bottom nav
const layouts = ['mobile/app/(admin)/_layout.tsx', 'mobile/app/(tabs)/_layout.tsx'];
layouts.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('name="reminder-details"')) {
      content = content.replace(
        /<Tabs\.Screen name="reminder-details"[\s\S]*?\/>/g,
        '<Tabs.Screen name="reminder-details/[id]" options={{ href: null, tabBarStyle: { display: \'none\' } }} />'
      );
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});

// 2. Fix FAB in reminders.tsx
const remindersList = ['mobile/app/(admin)/reminders.tsx', 'mobile/app/(tabs)/reminders.tsx'];
remindersList.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Change bottom: 24 to bottom: 90 to clear the tab bar
    content = content.replace(/bottom: 24,/g, 'bottom: 90,');
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

// 3. Update TimeChipGrid.tsx
const chipPath = 'mobile/src/components/reminders/TimeChipGrid.tsx';
if (fs.existsSync(chipPath)) {
  let content = fs.readFileSync(chipPath, 'utf8');
  content = content.replace(
    /const PREDEFINED_TIMES = \[[^\]]+\];/,
    "const PREDEFINED_TIMES = [\n  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',\n  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'\n];"
  );
  fs.writeFileSync(chipPath, content, 'utf8');
}
