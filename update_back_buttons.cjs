const fs = require('fs');
const path = require('path');

const dirs = [
  'mobile/app/(admin)',
  'mobile/app/(tabs)'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    if (item.endsWith('-details')) {
      const filePath = path.join(dir, item, '[id].tsx');
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes('fromSearch')) {
          content = content.replace(
            'const { id } = useLocalSearchParams();',
            'const { id, fromSearch } = useLocalSearchParams();'
          );
          
          const backPathMatch = content.match(/onBack=\{\(\) => router\.push\(['"](.*?)['"]\)\}/);
          if (backPathMatch) {
            const fallbackPath = backPathMatch[1];
            content = content.replace(
              /onBack=\{\(\) => router\.push\(['"].*?['"]\)\}/g,
              `onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('${fallbackPath}')}`
            );
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
          }
        }
      }
    }
  });
});
