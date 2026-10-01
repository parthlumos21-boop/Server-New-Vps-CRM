const fs = require('fs');

const fixNewTsx = (filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add import for CalendarModal
    if (!content.includes('CalendarModal')) {
      content = content.replace(
        "import DateTimePicker from '@react-native-community/datetimepicker';",
        "import DateTimePicker from '@react-native-community/datetimepicker';\nimport { CalendarModal } from '../../../src/components/calendar/CalendarModal';"
      );
    }

    // 2. Add showCalendar state
    if (!content.includes('showCalendar')) {
      content = content.replace(
        "const [showTimePicker, setShowTimePicker] = useState(false);",
        "const [showTimePicker, setShowTimePicker] = useState(false);\n  const [showCalendar, setShowCalendar] = useState(false);"
      );
    }

    // 3. Fix edges bottom
    content = content.replace(
      "edges={['top', 'bottom']}",
      "edges={['top']}"
    );

    // 4. Wrap Date string in TouchableOpacity
    content = content.replace(
      "<Text style={styles.sectionValue}>{format(new Date(date), 'dd-MM-yyyy')}</Text>",
      "<TouchableOpacity onPress={() => setShowCalendar(true)}><Text style={styles.sectionValue}>{format(new Date(date), 'dd-MM-yyyy')}</Text></TouchableOpacity>"
    );

    // 5. Inject CalendarModal before closing SafeAreaView
    if (!content.includes('<CalendarModal')) {
      content = content.replace(
        '    </SafeAreaView>',
        `      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={new Date(date)}
        onSelectDate={(newDate) => {
          if(newDate) setDate(format(newDate, 'yyyy-MM-dd'));
          setShowCalendar(false);
        }}
        reminders={[]}
      />
    </SafeAreaView>`
      );
    }

    // 6. Fix DateTimePicker properties
    content = content.replace('is24Hour={true}', 'is24Hour={false}\n          textColor={colors.primary}\n          accentColor={colors.primary}');

    // 7. Fix handleTimeChange to handle parse issues (Optional: Time AM/PM string parsing)
    // Actually, new Date(`${date}T${time}:00`) might break if time is AM/PM string.
    // The previous state was '09:00', but now it's '09:00 AM'. We must ensure we parse correctly.
    // Let's modify handleTimeChange and the state of `time` inside `new.tsx`.
    // We can keep `time` as a 24-hour string (HH:mm) internally, but format it to AM/PM for display.
    content = content.replace(
      "const [time, setTime] = useState('09:00');",
      "const [time, setTime] = useState('09:00');"
    );
    // Actually TimeChipGrid returns '09:00 AM', so `setTime` sets it to '09:00 AM'.
    // `new Date(date + 'T' + time)` will break if time is '09:00 AM'.
    // Let's parse the time string safely.
    content = content.replace(
      "value={new Date(`${date}T${time}:00`)}",
      "value={new Date(`${date}T${time.length > 5 ? new Date('2000-01-01 ' + time).toTimeString().substring(0, 5) : time}:00`)}"
    );
    // And in handleSave payload:
    content = content.replace(
      "remindAt: `${date}T${time}:00`,",
      "remindAt: `${date}T${time.length > 5 ? new Date('2000-01-01 ' + time).toTimeString().substring(0, 5) : time}:00`,"
    );
    content = content.replace(
      "reminderTime: time,",
      "reminderTime: time.length > 5 ? new Date('2000-01-01 ' + time).toTimeString().substring(0, 5) : time,"
    );

    // Format handleTimeChange output to AM/PM
    content = content.replace(
      "setTime(format(selectedDate, 'HH:mm'));",
      "setTime(format(selectedDate, 'hh:mm a'));"
    );

    fs.writeFileSync(filePath, content, 'utf8');
  }
};

fixNewTsx('mobile/app/(admin)/reminders/new.tsx');
fixNewTsx('mobile/app/(tabs)/reminders/new.tsx');
