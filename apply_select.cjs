const fs = require('fs');
const path = require('path');

const pPath = 'mobile/src/components/accounts/SelectField.tsx';
if (fs.existsSync(pPath)) {
  let content = fs.readFileSync(pPath, 'utf8');

  if (!content.includes('searchText')) {
    content = content.replace(
      "import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';",
      "import { Modal, Pressable, StyleSheet, Text, View, ScrollView, TextInput } from 'react-native';\nimport { Feather } from '@expo/vector-icons';"
    );
    
    content = content.replace(
      'const [visible, setVisible] = useState(false);',
      "const [visible, setVisible] = useState(false);\n  const [searchText, setSearchText] = useState('');\n  const filteredOptions = options.filter(opt => \n    opt.toLowerCase().includes(searchText.toLowerCase())\n  );"
    );

    content = content.replace(
      'onRequestClose={() => setVisible(false)}',
      'onRequestClose={() => setVisible(false)}\n        onShow={() => setSearchText(\'\')}'
    );

    content = content.replace(
      '<ScrollView showsVerticalScrollIndicator={true}>',
      '<View style={styles.searchContainer}>\n              <Feather name="search" size={18} color={colors.textSecondary} />\n              <TextInput\n                style={styles.searchInput}\n                placeholder="Search..."\n                value={searchText}\n                onChangeText={setSearchText}\n                placeholderTextColor={colors.textMuted}\n                autoCapitalize="none"\n              />\n            </View>\n            <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">'
    );

    content = content.replace(
      '{options.map((option) => (',
      '{filteredOptions.length === 0 ? <Text style={styles.noResults}>No results found</Text> : filteredOptions.map((option) => ('
    );

    content = content.replace(
      '  optionText: {',
      '  searchContainer: {\n    flexDirection: \'row\',\n    alignItems: \'center\',\n    paddingHorizontal: 16,\n    borderBottomWidth: 1,\n    borderBottomColor: colors.border,\n    backgroundColor: \'#F9FAFB\',\n  },\n  searchInput: {\n    flex: 1,\n    height: 48,\n    marginLeft: 8,\n    ...typography.body,\n    color: colors.textPrimary,\n  },\n  noResults: {\n    padding: 18,\n    ...typography.body,\n    color: colors.textMuted,\n    textAlign: \'center\',\n  },\n  optionText: {'
    );

    fs.writeFileSync(pPath, content, 'utf8');
  }
}
