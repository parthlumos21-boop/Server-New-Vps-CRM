require('dotenv').config({ path: '../.env' });
const { mongoose, connectDatabase } = require('../config/db');

const fixAccountNos = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB. Renaming accountNo to ownerCode...');

    const User = require('../models/mongoModels').getMongoModel('users');
    
    // Rename field
    const result = await User.updateMany(
      { accountNo: { $exists: true } },
      [ { $set: { ownerCode: "$accountNo" } }, { $unset: ["accountNo"] } ]
    );

    console.log(`Migration completed successfully.`);
    console.log(`Modified records: ${result.modifiedCount}`);

    mongoose.connection.close();
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
};

fixAccountNos();
