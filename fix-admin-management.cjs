const fs = require('fs');
const authFile = 'server/services/authService.js';
const ctrlFile = 'server/controllers/userController.js';
let authCode = fs.readFileSync(authFile, 'utf8');
let ctrlCode = fs.readFileSync(ctrlFile, 'utf8');
// The strict backend rules blocking Admin creation/editing
const r1 = /if \(!isSupportedRole\(role\) \|\| isPrivilegedRole\(role\)\) \{\s*throw new AppError\('Only standard user roles can be created through this flow\.', 400\)\s*\}/g;
const replace1 = `if (!isSupportedRole(role)) {
      throw new AppError('Only standard user roles can be created through this flow.', 400)
    }`;
const r2 = /if \(isPrivilegedRole\(targetUser\.role\) && !kevalCanManageTarget\) \{\s*throw new AppError\('Privileged accounts cannot be modified through this form\.', 403\)\s*\}/g;
const replace2 = `// Admin modification restriction removed`;
const r3 = /if \(isPrivilegedRole\(target\.role\)\) \{\s*throw new AppError\('Privileged accounts cannot be deleted through this API\.', 403\)\s*\}/g;
const replace3 = `// Admin deletion restriction removed`;
// Apply the fixes
if (r1.test(authCode)) {
  authCode = authCode.replace(r1, replace1);
  authCode = authCode.replace(r2, replace2);
  fs.writeFileSync(authFile, authCode);
  console.log('Success! Patched authService.js to allow creating and editing Admins!');
} else {
  console.log('authService.js was already patched or not found.');
}
if (r3.test(ctrlCode)) {
  ctrlCode = ctrlCode.replace(r3, replace3);
  fs.writeFileSync(ctrlFile, ctrlCode);
  console.log('Success! Patched userController.js to allow deleting Admins!');
} else {
  console.log('userController.js was already patched or not found.');
}
