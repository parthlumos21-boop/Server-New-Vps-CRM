require('dotenv').config({ path: '../.env' });
const { mongoose, connectDatabase } = require('../config/db');
const { getMongoModel } = require('../models/mongoModels');

const SupportUsers = getMongoModel('support_users');
const SupportGroups = getMongoModel('support_groups');

const supportUsersToInsert = [
  { name: 'Parth', email: 'parth@support.com', role: 'admin' },
  { name: 'Rushabh', email: 'rushabh@support.com', role: 'admin' },
];

const seed = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB. Seeding support data...');

    // 1. Create or find default support group
    let defaultGroup = await SupportGroups.findOne({ name: 'Default Support' });
    if (!defaultGroup) {
      defaultGroup = await SupportGroups.create({
        name: 'Default Support',
        description: 'Default support group for all support agents',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('[OK] Created group: Default Support');
    } else {
      console.log('[SKIP] Group already exists: Default Support');
    }

    // 2. Insert Support Users
    for (const u of supportUsersToInsert) {
      const existing = await SupportUsers.findOne({ email: u.email });
      if (existing) {
        console.log(`[UPDATE] Support user already exists: ${u.email}. Upgrading role to admin.`);
        existing.role = u.role;
        await existing.save();
        
        // Ensure user is in group
        if (!defaultGroup.members.includes(existing._id.toString())) {
          defaultGroup.members.push(existing._id.toString());
        }
        continue;
      }

      const createdUser = await SupportUsers.create({
        name: u.name,
        email: u.email,
        role: u.role,
        groupId: defaultGroup._id.toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`[OK] Created support user: ${createdUser.email}`);

      defaultGroup.members.push(createdUser._id.toString());
    }

    await defaultGroup.save();
    console.log('[OK] Updated Default Support group members.');

    console.log('Support seeding completed.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error during support seeding:', err);
    process.exit(1);
  }
};

seed();
