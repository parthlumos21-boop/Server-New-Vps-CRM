const fs = require('fs');
const content = fs.readFileSync('c:/Users/Lumos/Desktop/Swati CRM/mobile/src/utils/accountFilters.ts', 'utf8').replace('// @ts-nocheck', '').replace(/export const/g, 'const').replace(/export /g, '').replace(/import { isSameCrmOwner } from '.\/crmUserDirectory';/, '');
const dirContent = fs.readFileSync('c:/Users/Lumos/Desktop/Swati CRM/mobile/src/utils/crmUserDirectory.ts', 'utf8').replace('// @ts-nocheck', '').replace(/export const/g, 'const').replace(/export /g, '');

const fullScript = dirContent + '\n' + content + '\n\n' + 
const user = { name: 'Marketing', email: 'mkt@swatiswitchgears.com', id: 16 };
const record = { 
  raw: { ownerName: 'Atish Shah', createdByUserId: 1 }, 
  accountOwner: 'Atish Shah', 
  createdBy: 1 
};
console.log('Test 1 (should be false):', isOwnedByCurrentUser(record, user));

const user2 = { name: 'Keval V Shah', email: 'keval@swatiswitchgears.com', id: 10 };
console.log('Test 2 (should be true for Keval?):', isOwnedByCurrentUser(record, user2));
;
fs.writeFileSync('test_filter.js', fullScript);
