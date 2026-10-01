const fs = require('fs');
const path = require('path');

// Step 1: Update Deals Icon in layout
const layouts = ['mobile/app/(admin)/_layout.tsx', 'mobile/app/(tabs)/_layout.tsx'];
layouts.forEach(lPath => {
  if (fs.existsSync(lPath)) {
    let content = fs.readFileSync(lPath, 'utf8');
    if (!content.includes('FontAwesome5')) {
      content = content.replace("import { Feather } from '@expo/vector-icons';", "import { Feather, FontAwesome5 } from '@expo/vector-icons';");
    }
    content = content.replace(
      /<Feather name="target" size=\{24\} color=\{color\} \/>/g,
      '<FontAwesome5 name="handshake" size={20} color={color} />'
    );
    fs.writeFileSync(lPath, content, 'utf8');
  }
});

// Step 3: Support Request Card Navigation
const dashboards = ['mobile/app/(admin)/dashboard.tsx', 'mobile/app/(tabs)/dashboard.tsx'];
dashboards.forEach(dPath => {
  if (fs.existsSync(dPath)) {
    let content = fs.readFileSync(dPath, 'utf8');
    const folderName = dPath.includes('(admin)') ? '(admin)' : '(tabs)';
    content = content.replace(
      /router\.push\(['"]\/support['"]\)/g,
      `router.push('/${folderName}/support')`
    );
    fs.writeFileSync(dPath, content, 'utf8');
  }
});

// Step 4: Remove "Ex: " from cards
const dirs = ['mobile/app/(admin)', 'mobile/app/(tabs)'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
    files.forEach(f => {
      const filePath = path.join(dir, f);
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('Ex: ')) {
        content = content.replace(/>Ex: /g, '>');
        fs.writeFileSync(filePath, content, 'utf8');
      }
    });
  }
});
