const mongoose = require('../server/node_modules/mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/crm');
  const db = mongoose.connection.db;
  const leadsCol = db.collection('leads');

  const totalBefore = await leadsCol.countDocuments({});
  console.log(`Total leads in DB before cleanup: ${totalBefore}`);

  const corruptFilter = {
    $or: [
      { accountName: { $regex: /Report Filter/i } },
      { customerName: { $regex: /Report Filter/i } },
      { name: { $regex: /Report Filter/i } },
      { 'formData.accountName': { $regex: /Report Filter/i } },
      { 'formData.customerName': { $regex: /Report Filter/i } },
      { 'formData.name': { $regex: /Report Filter/i } },
    ]
  };

  const corruptCount = await leadsCol.countDocuments(corruptFilter);
  console.log(`Corrupt leads count to delete: ${corruptCount}`);

  if (corruptCount > 0) {
    const deleteResult = await leadsCol.deleteMany(corruptFilter);
    console.log(`Deleted ${deleteResult.deletedCount} corrupt records containing 'Report Filter'`);
  }

  const totalAfter = await leadsCol.countDocuments({});
  console.log(`Total leads in DB after cleanup: ${totalAfter}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
