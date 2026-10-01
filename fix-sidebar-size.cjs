const fs = require('fs');
const file = 'src/components/layout/Sidebar.jsx';
let code = fs.readFileSync(file, 'utf8');
const lumosIndex = code.indexOf('alt="Lumos Logo"');
if (lumosIndex !== -1) {
    const before = code.substring(0, lumosIndex);
    let after = code.substring(lumosIndex);
    
    // Replace the height just for the Lumos logo and add a zoom scale
    after = after.replace("maxHeight: '60px',", "maxHeight: '120px',\n              transform: 'scale(1.6)',");
    
    fs.writeFileSync(file, before + after);
    console.log('Successfully increased Lumos logo size in Sidebar!');
} else {
    console.log('Could not find Lumos logo in Sidebar.jsx');
}
