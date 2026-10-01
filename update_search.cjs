const fs = require('fs');
const path = 'mobile/src/components/search/GlobalSearchScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('KeyboardAvoidingView')) {
  content = content.replace(
    'import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from \'react-native\';',
    'import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from \'react-native\';'
  );

  content = content.replace(
    '<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>',
    '<KeyboardAvoidingView behavior={Platform.OS === \'ios\' ? \'padding\' : undefined} style={{ flex: 1 }}>\n      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps=\"handled\">'
  );

  content = content.replace(
    '      </ScrollView>\n    </SafeAreaView>',
    '      </ScrollView>\n      </KeyboardAvoidingView>\n    </SafeAreaView>'
  );

  content = content.replace(
    'scrollContent: {',
    'scrollContent: {\n    width: \'100%\',\n    maxWidth: 768,\n    alignSelf: \'center\','
  );

  fs.writeFileSync(path, content, 'utf8');
}
