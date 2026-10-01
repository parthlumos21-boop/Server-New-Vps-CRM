const mongoose = require('mongoose');

async function checkDevices() {
  await mongoose.connect('mongodb://127.0.0.1:27017/swati_crm_db');
  const UserDevice = mongoose.connection.collection('user_devices');
  const devices = await UserDevice.find({}).toArray();
  console.log(JSON.stringify(devices, null, 2));
  process.exit(0);
}

checkDevices().catch(console.error);
