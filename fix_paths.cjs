const fs = require('fs');

const fixPaths = (filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/src/g, '../../../src');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed paths in ${filePath}`);
  }
};

fixPaths('mobile/app/(admin)/reminders/new.tsx');
fixPaths('mobile/app/(tabs)/reminders/new.tsx');
