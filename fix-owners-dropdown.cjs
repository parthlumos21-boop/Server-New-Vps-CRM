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
    
    // Bulletproof logic: Removes the strict `&& u.ownerCode` restriction 
    // and guarantees users will show up under Swati or Lumos correctly.
    const newLoadOwners = `const loadOwners = async () => {
      try {
        const users = await userApi.listDirectory();
        const validUsers = Array.isArray(users) ? users : [];
        const formatUser = (u) => ({ value: u.name || u.username || u.email, label: u.name || u.username || u.email });
        
        setSwatiUsers(validUsers.filter((u) => {
            const comp = String(u.company || u.companyName || '').toLowerCase();
            return comp.includes('swati') || u.companyId === 1 || (!comp.includes('lumos') && u.companyId !== 2);
        }).map(formatUser));
        
        setLumosUsers(validUsers.filter((u) => {
            const comp = String(u.company || u.companyName || '').toLowerCase();
            return comp.includes('lumos') || u.companyId === 2;
        }).map(formatUser));
      } catch (err) {
        console.error('Failed to load owners:', err);
      }
    }
    loadOwners()`;
    
    fs.writeFileSync(file, before + newLoadOwners + after);
    console.log('Successfully fixed the Account Owner dropdown logic!');
} else {
    console.log('Could not find loadOwners function. It may have already been replaced.');
}
