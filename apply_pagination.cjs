const fs = require('fs');
const path = require('path');

const pPath = 'mobile/src/components/ui/Pagination.tsx';
if (fs.existsSync(pPath)) {
  let content = fs.readFileSync(pPath, 'utf8');

  // Insert First Button before Back Button
  content = content.replace(
    '{/* Back Button */}',
    `{/* First Button */}
      <TouchableOpacity
        style={[styles.button, styles.navButton, { marginRight: 4 }, currentPage === 1 && styles.disabledButton]}
        onPress={() => onPageChange(1)}
        disabled={currentPage === 1}
        accessibilityLabel="First Page"
      >
        <Text style={[styles.navText, currentPage === 1 && styles.disabledText]}>First</Text>
      </TouchableOpacity>

      {/* Back Button */}`
  );

  // Insert Last Button after Next Button
  content = content.replace(
    '</TouchableOpacity>\n    </View>',
    `</TouchableOpacity>

      {/* Last Button */}
      <TouchableOpacity
        style={[styles.button, styles.navButton, { marginLeft: 4 }, currentPage === totalPages && styles.disabledButton]}
        onPress={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        accessibilityLabel="Last Page"
      >
        <Text style={[styles.navText, currentPage === totalPages && styles.disabledText]}>Last</Text>
      </TouchableOpacity>
    </View>`
  );

  fs.writeFileSync(pPath, content, 'utf8');
}
