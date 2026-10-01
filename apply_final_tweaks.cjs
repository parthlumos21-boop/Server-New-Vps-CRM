const fs = require('fs');

// 1. Hide reminder-details completely from Tab Bar
const layouts = ['mobile/app/(admin)/_layout.tsx', 'mobile/app/(tabs)/_layout.tsx'];
layouts.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('name="reminder-details" options={{ href: null')) {
      content = content.replace(
        /<Tabs\.Screen name="reminder-details\/\[id\]"[\s\S]*?\/>/g,
        '<Tabs.Screen name="reminder-details/[id]" options={{ href: null, tabBarStyle: { display: \'none\' } }} />\n      <Tabs.Screen name="reminder-details" options={{ href: null, tabBarStyle: { display: \'none\' } }} />'
      );
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});

// 2. Update CalendarButton
const btnPath = 'mobile/src/components/reminders/CalendarButton.tsx';
if (fs.existsSync(btnPath)) {
  let content = fs.readFileSync(btnPath, 'utf8');
  content = content.replace(
    'interface CalendarButtonProps {\n  onPress: () => void;\n  style?: ViewStyle;\n}',
    'interface CalendarButtonProps {\n  onPress: () => void;\n  isActive?: boolean;\n  style?: ViewStyle;\n}'
  );
  content = content.replace(
    'export const CalendarButton: React.FC<CalendarButtonProps> = ({ onPress, style }) => {',
    'export const CalendarButton: React.FC<CalendarButtonProps> = ({ onPress, isActive, style }) => {'
  );
  content = content.replace(
    '<TouchableOpacity style={[styles.button, style]} onPress={onPress}>\n      <Feather name="calendar" size={20} color="#B91C1C" />\n    </TouchableOpacity>',
    '<TouchableOpacity style={[styles.button, isActive ? styles.activeButton : styles.inactiveButton, style]} onPress={onPress}>\n      <Feather name="calendar" size={20} color={isActive ? "#FFFFFF" : "#6B7280"} />\n    </TouchableOpacity>'
  );
  content = content.replace(
    '  button: {\n    width: 40,\n    height: 40,\n    borderRadius: 12,\n    backgroundColor: \'#FEE2E2\',\n    justifyContent: \'center\',\n    alignItems: \'center\',\n    borderWidth: 1,\n    borderColor: \'#FCA5A5\',\n  },',
    '  button: {\n    width: 40,\n    height: 40,\n    borderRadius: 12,\n    justifyContent: \'center\',\n    alignItems: \'center\',\n    borderWidth: 1,\n  },\n  activeButton: {\n    backgroundColor: \'#C62828\',\n    borderColor: \'#C62828\',\n  },\n  inactiveButton: {\n    backgroundColor: \'#FFFFFF\',\n    borderColor: \'#E5E7EB\',\n  },'
  );
  fs.writeFileSync(btnPath, content, 'utf8');
}

// 3. Update CalendarModal to be centered
const modalPath = 'mobile/src/components/calendar/CalendarModal.tsx';
if (fs.existsSync(modalPath)) {
  let content = fs.readFileSync(modalPath, 'utf8');
  content = content.replace(
    "justifyContent: 'flex-end',",
    "justifyContent: 'center',\n      alignItems: 'center',\n      padding: 20,"
  );
  content = content.replace(
    "borderTopLeftRadius: 28,\n      borderTopRightRadius: 28,",
    "borderRadius: 20,\n      width: '100%',\n      maxWidth: 400,"
  );
  fs.writeFileSync(modalPath, content, 'utf8');
}

// 4. Update reminders.tsx to pass isActive to CalendarButton
const remindersList = ['mobile/app/(admin)/reminders.tsx', 'mobile/app/(tabs)/reminders.tsx'];
remindersList.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      '<CalendarButton onPress={() => setIsCalendarVisible(true)} />',
      '<CalendarButton isActive={isCalendarVisible} onPress={() => setIsCalendarVisible(true)} />'
    );
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
