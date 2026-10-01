const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const EXCLUDE_DIRS = ['auth'];

function getCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        getCssFiles(filePath, fileList);
      }
    } else if (file.endsWith('.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function processCssFiles() {
  const cssFiles = getCssFiles(SRC_DIR);
  let totalFilesAffected = 0;

  for (const filePath of cssFiles) {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    let content = originalContent;

    // Fix ALL light backgrounds (#c, #d, #e, #f) missed previously.
    content = content.replace(/background(-color)?:\s*#[c-fC-F][a-fA-F0-9]{2,5}\b/gi, 'background$1: var(--surface-muted)');

    // Fix remaining stubborn borders
    content = content.replace(/border(-[a-z]+)?:\s*([^;]+)#[a-fA-F0-9]{3,6}\b/gi, 'border$1: $2var(--border-subtle)');
    
    // Catch border-color explicitly
    content = content.replace(/border-color:\s*#[a-fA-F0-9]{3,6}/gi, 'border-color: var(--border-subtle)');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      totalFilesAffected++;
      console.log('Updated: ' + path.relative(__dirname, filePath));
    }
  }

  console.log('\nBackgrounds and Borders sweep complete! Total files updated: ' + totalFilesAffected);
}

processCssFiles();
