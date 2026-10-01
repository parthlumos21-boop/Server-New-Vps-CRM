const fs = require('fs');
const file = 'src/pages/accounts/AddAccountWizard.jsx';
if (!fs.existsSync(file)) {
  console.log('Error: File not found!');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
const start = code.indexOf('const loadOwners = async () => {');
const end = code.indexOf('loadOwners()', start) + 'loadOwners()'.length;
if (start !== -1 && end !== -1) {
    const before = code.substring(0, start);
    const after = code.substring(end);
    
    // Updated logic: Added .sort(sortAlphabetically) to both lists
    const newLoadOwners = `const loadOwners = async () => {
      try {
        const users = await userApi.listDirectory();
        const validUsers = Array.isArray(users) ? users : [];
        const formatUser = (u) => ({ value: u.name || u.username || u.email, label: u.name || u.username || u.email });
        
        // Sorting function to arrange alphabetically A-Z
        const sortAlphabetically = (a, b) => String(a.label).localeCompare(String(b.label));
        
        setSwatiUsers(validUsers.filter((u) => {
            const comp = String(u.company || u.companyName || '').toLowerCase();
            return comp.includes('swati') || u.companyId === 1 || (!comp.includes('lumos') && u.companyId !== 2);
        }).map(formatUser).sort(sortAlphabetically));
        
        setLumosUsers(validUsers.filter((u) => {
            const comp = String(u.company || u.companyName || '').toLowerCase();
            return comp.includes('lumos') || u.companyId === 2;
        }).map(formatUser).sort(sortAlphabetically));
      } catch (err) {
        console.error('Failed to load owners:', err);
      }
    }
    loadOwners()`;
    
    fs.writeFileSync(file, before + newLoadOwners + after);
    console.log('Successfully sorted Account Owners alphabetically!');
} else {
    console.log('Could not find loadOwners function.');
}
