require('dotenv').config({ path: '../.env' });
const { mongoose, connectDatabase } = require('../config/db');

const migrateAccountNos = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB. Starting AccountNo assignment migration...');

    const User = require('../models/mongoModels').getMongoModel('users');
    
    // 1. Delete Tajammul Solkar
    const delResult = await User.deleteMany({
      $or: [
        { email: { $regex: /tajammul/i } },
        { name: { $regex: /tajammul/i } },
        { username: { $regex: /tajammul/i } }
      ]
    });
    console.log(`Deleted Tajammul Solkar records: ${delResult.deletedCount}`);

    // 2. Fetch all users
    const allUsers = await User.find({}).sort({ createdAt: 1 });
    console.log(`Total users found: ${allUsers.length}`);

    let swatiCounter = 1001;
    let lumosCounter = 2001;

    let modifiedCount = 0;

    for (const user of allUsers) {
      if (user.accountNo) continue; // Skip if already assigned

      let nextNo;
      if (user.company === 'lumos') {
        nextNo = String(lumosCounter++);
      } else {
        // default to swati or anything else
        nextNo = String(swatiCounter++);
      }

      await User.updateOne({ _id: user._id }, { $set: { accountNo: nextNo } });
      modifiedCount++;
    }

    console.log(`Migration completed successfully.`);
    console.log(`Modified records: ${modifiedCount}`);
    console.log(`Next Swati sequence: ${swatiCounter}`);
    console.log(`Next Lumos sequence: ${lumosCounter}`);

    mongoose.connection.close();
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
};

migrateAccountNos();
