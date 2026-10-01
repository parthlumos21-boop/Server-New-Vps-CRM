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
    
    const newLoadOwners = `const loadOwners = async () => {
      try {
        const users = await userApi.listDirectory();
        const validUsers = Array.isArray(users) ? users : [];
        const formatUser = (u) => ({ value: u.name || u.username || u.email, label: u.name || u.username || u.email });
        const sortAlphabetically = (a, b) => String(a.label).localeCompare(String(b.label));
        
        // Exact list provided by user for SWATI
        const hardcodedSwatiList = [
          'VAIBHAVI PATEL',
          'Samir Sheth',
          'Daxesh Rohit',
          'Rajeshree',
          'Samir Jha',
          'Monali Pateliya',
          'Naim Vhora',
          'Jagruti Parmar',
          'Jay Pandya',
          'Kanubhai Shah',
          'Atish Shah',
          'Bhavesh Prajapati',
          'Hasmukh',
          'Nita Bhavsar',
          'Keval V Shah',
          'Vaibhav Tirkar',
          'Krunal Patel',
          'Riya Patel'
        ];
        
        // Map the hardcoded list directly into the dropdown options for SWATI
        setSwatiUsers(hardcodedSwatiList.map(name => ({ value: name, label: name })));
        
        // Leave LUMOS dynamic and alphabetically sorted
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
    console.log('Successfully applied the custom SWATI Account Owners list!');
} else {
    console.log('Could not find loadOwners function.');
}
