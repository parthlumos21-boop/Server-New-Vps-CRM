const fs = require('fs');
const file = 'src/pages/admin/accounts/MyGroupAccountsPage.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    // Locate the exact broken line
    if (lines[i].includes('getMongoOwnerCodeOnly(row)-${num}`')) {
        let idx = lines[i].indexOf('getMongoOwnerCodeOnly(row)-${num}`');
        
        // Strip out the broken string part
        lines[i] = lines[i].substring(0, idx) + 'getMongoOwnerCodeOnly(row)';
        
        let foundReturn = false;
        let j = i + 1;
        
        // Safely delete the orphaned lines below it
        while (j < lines.length && j < i + 6) {
            let trimmed = lines[j].trim();
            
            if (trimmed === 'return num;') {
                lines[j] = ''; // Delete
                foundReturn = true;
            } else if (foundReturn && (trimmed === '}' || trimmed === '},')) {
                if (trimmed === '},') {
                    lines[i] += ','; // Safely preserve the comma if it was part of an object
                }
                lines[j] = ''; // Delete the orphaned closing brace
                break;
            }
            j++;
        }
    }
}
fs.writeFileSync(file, lines.join('\n'));
console.log('Syntax error completely removed!');
