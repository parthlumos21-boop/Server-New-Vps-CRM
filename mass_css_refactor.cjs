const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const EXCLUDE_DIRS = ['auth']; // Strictly exclude Login/Register

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
  let totalReplaced = 0;
  let totalFilesAffected = 0;

  for (const filePath of cssFiles) {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    let content = originalContent;

    // 1. Replace bright white backgrounds with var(--surface-card)
    content = content.replace(/background(-color)?:\s*(#ffffff|#fff|white)\b(?!\s*\))/gi, 'background$1: var(--surface-card)');

    // 2. Replace light gray backgrounds with var(--surface-app)
    content = content.replace(/background(-color)?:\s*(#f8fafc|#f1f5f9|#f4f6f8)\b/gi, 'background$1: var(--surface-app)');

    // 3. Replace dark text colors with var(--text-primary)
    // Ignore cases where it's part of a gradient or specific dark mode override (though we're doing a global sweep)
    content = content.replace(/color:\s*(#111827|#333333|#333|#000000|#000|#1f2937)\b/gi, 'color: var(--text-primary)');
    
    // Replace lighter dark texts with var(--text-secondary)
    content = content.replace(/color:\s*(#4b5563|#6b7280|#666666|#666|#444444|#444)\b/gi, 'color: var(--text-secondary)');

    // 4. Replace hardcoded borders with var(--glass-border)
    // For `border: 1px solid #e2e8f0;`, we can't easily catch the whole thing safely with regex without being complex.
    // Instead, just replace the color portion in border properties.
    content = content.replace(/border(-color)?:\s*([^;}]*?)(#e2e8f0|#cbd5e1|#d1d5db|#e5e7eb|#d8dde7|#eaeaea|#eee|#eeeeee)\b/gi, 'border$1: $2var(--glass-border)');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      totalFilesAffected++;
      console.log(`Updated: ${path.relative(__dirname, filePath)}`);
    }
  }

  console.log(`\nMass refactor complete!`);
  console.log(`Total files updated: ${totalFilesAffected}`);
}

processCssFiles();
