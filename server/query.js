const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/crm').then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ $or: [{ name: /keval/i }, { username: /keval/i }] }).toArray();
  console.log(JSON.stringify(users.map(u => ({ name: u.name, accountNo: u.accountNo, ownerCode: u.ownerCode, id: u.legacyId || u._id })), null, 2));
  process.exit(0);
}).catch(console.error);
