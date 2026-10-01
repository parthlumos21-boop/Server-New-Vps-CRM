const { MongoClient } = require('mongodb');
require('dotenv').config({path: 'server/.env'});

MongoClient.connect(process.env.MONGODB_URI).then(async (c) => {
  const db = c.db();
  await db.collection('leads').updateOne(
    { legacyId: 18 },
    { $set: { 'formData.addedBy': 'Keval V Shah', createdByUserName: 'Keval V Shah' } }
  );
  console.log('Updated account 18');
  c.close();
}).catch(console.error);
