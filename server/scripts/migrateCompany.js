require('dotenv').config({ path: '../.env' });
const { mongoose, connectDatabase } = require('../config/db');

const migrateCompany = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB. Starting user company migration...');

    const User = require('../models/mongoModels').getMongoModel('users');
    
    // Find all users missing the company field or where it's null or empty
    const result = await User.updateMany(
      {
        $or: [
          { company: { $exists: false } },
          { company: null },
          { company: '' }
        ]
      },
      {
        $set: { company: 'swati' }
      }
    );

    console.log(`Migration completed successfully.`);
    console.log(`Matched records: ${result.matchedCount}`);
    console.log(`Modified records: ${result.modifiedCount}`);

    mongoose.connection.close();
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
};

migrateCompany();
