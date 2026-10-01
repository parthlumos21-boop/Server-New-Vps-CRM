const mongoose = require('mongoose');
const { getCanonicalCrmUserName } = require('../../src/features/users/crmUserDirectory');

const normalizeCrmUserName = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeUserRecord = (user = {}) => {
  const trimmedName = String(user.name || '').trim();
  const canonicalName = getCanonicalCrmUserName(trimmedName);
  const resolvedName = canonicalName || trimmedName;

  return {
    ...user,
    id: user.id ?? '',
    username: String(user.username || '').trim().toLowerCase(),
    name: resolvedName,
    ownerCode: String(user.ownerCode || user.owner_code || '').trim(),
  };
};

mongoose.connect('mongodb://127.0.0.1:27017/crm')
  .then(() => mongoose.connection.db.collection('users').find({}).toArray())
  .then(users => {
    const uniqueUsers = new Map();

    users
      .map(u => ({ ...u, id: u.legacyId || u._id }))
      .map((user) => normalizeUserRecord(user))
      .filter((user) => user.id)
      .forEach((user) => {
        const ownerKey = user.ownerCode
          ? `code:${user.ownerCode}`
          : `name:${normalizeCrmUserName(user.name || user.username || user.email)}`;
        const existingUser = uniqueUsers.get(ownerKey);
        if (!existingUser || String(existingUser.id || '').startsWith('crm-')) {
          uniqueUsers.set(ownerKey, user);
        } else {
           console.log("COLLISION:", ownerKey, existingUser.name, user.name);
        }
      });

    console.log(uniqueUsers.get('code:1007'));
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
