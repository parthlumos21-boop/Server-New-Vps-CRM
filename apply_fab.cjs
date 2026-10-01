const fs = require('fs');
const path = require('path');

const addFabToReminders = (filePath, targetFolder) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('add-fab-button')) {
      // Find the return statement of the component
      content = content.replace(
        /<CalendarModal\s+visible=\{isCalendarVisible\}\s+onClose=\{\(\) => setIsCalendarVisible\(false\)\}\s+selectedDate=\{selectedDate\}\s+onSelectDate=\{setSelectedDate\}\s+\/>/g,
        `<CalendarModal
          visible={isCalendarVisible}
          onClose={() => setIsCalendarVisible(false)}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        
        {/* add-fab-button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push(\`/\${targetFolder}/reminders/new\` as any)}
        >
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>`
      );
      
      if (!content.includes('fab: {')) {
        content = content.replace(
          'const styles = StyleSheet.create({',
          `const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },`
        );
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
};

addFabToReminders('mobile/app/(admin)/reminders.tsx', '(admin)');
addFabToReminders('mobile/app/(tabs)/reminders.tsx', '(tabs)');
