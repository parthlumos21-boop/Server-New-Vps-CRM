#!/bin/bash
echo "Restoring Deals.jsx to fix the syntax error..."
git checkout -- src/pages/deals/Deals.jsx 2>/dev/null || true
echo "Applying safe deletion of the + and Filter buttons..."
cat << 'NODE_EOF' > safe-remove.cjs
const fs = require('fs');
const file = 'src/pages/deals/Deals.jsx';
let code = fs.readFileSync(file, 'utf8');
// These regexes use [^<]* to safely target only the button
const plusRegex = /<button[^<]*title="Add Deal"[^<]*>\s*<FaPlus \/>\s*<\/button>/g;
const filterRegex = /<button[^<]*title="Filter"[^<]*>\s*<FaFilter \/>\s*<\/button>/g;
let matchPlus = (code.match(plusRegex) || []).length;
let matchFilter = (code.match(filterRegex) || []).length;
if (matchPlus > 0 || matchFilter > 0) {
  // Replace with an empty React Fragment <></> to prevent syntax errors
  code = code.replace(plusRegex, '<></>');
  code = code.replace(filterRegex, '<></>');
  fs.writeFileSync(file, code);
  console.log(`Success! Safely removed ${matchPlus} Add Deal (+) buttons and ${matchFilter} Filter buttons.`);
} else {
  console.log('The buttons were not found. They may be formatted differently.');
}
NODE_EOF
node safe-remove.cjs
rm safe-remove.cjs
echo "Rebuilding the project..."
npm run build
