require('dotenv').config({ path: '../.env' });
const { mongoose, connectDatabase } = require('../config/db');
const userRepository = require('../repositories/userRepository');
const { hashPassword } = require('../utils/password');

const slugifyUsername = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || `user-${Date.now()}`

const adminsToEnsure = [
  { name: 'Parth', email: 'parth@support.com', password: 'parth@123', role: 'admin' },
  { name: 'Rushabh', email: 'rushabh@support.com', password: 'rushabh@123', role: 'admin' },
];

const fixAdmins = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB. Fixing admin users...');

    for (const admin of adminsToEnsure) {
      let existing = await userRepository.findUserByEmail(admin.email);
      const passwordHash = await hashPassword(admin.password);

      if (existing) {
        console.log(`[UPDATE] User exists: ${admin.email}. Updating role to admin and resetting password.`);
        // Note: Using the mongoose model to update since repository might not have a direct update method
        const User = require('../models/mongoModels').getMongoModel('users');
        await User.updateOne(
          { email: new RegExp(`^${admin.email}$`, 'i') }, 
          { 
            $set: { 
              role: admin.role, 
              password_hash: passwordHash,
              passwordHash: passwordHash,
              status: 'approved',
              is_approved: true,
              isApproved: true
            } 
          }
        );
      } else {
        console.log(`[CREATE] User does not exist: ${admin.email}. Creating new admin user.`);
        
        let baseUsername = slugifyUsername(admin.name || admin.email.split('@')[0]);
        let username = baseUsername;
        let counter = 1;
        while (await userRepository.findUserByLogin(username)) {
          username = `${baseUsername}-${counter}`;
          counter++;
        }

        const created = await userRepository.createUser({
          username,
          name: admin.name,
          email: admin.email,
          passwordHash,
          role: admin.role,
          companyId: 1,
          status: 'approved',
          isApproved: true
        });
        console.log(`[OK] Created admin user: ${created.email} (${created.username})`);
      }
    }

    console.log('Admin fix completed successfully.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error during admin fix:', err);
    process.exit(1);
  }
};

fixAdmins();
