require('dotenv').config();
const { mongoose, connectDatabase } = require('./config/db');
const userRepository = require('./repositories/userRepository');
const { hashPassword } = require('./utils/password');

const usersToInsert = [
  // Ahmedabad
  { name: 'Nita Bhavsar', email: 'mkt@swatiswitchgears.com', password: 'Nita@crm' },
  { name: 'Krunal Patel', email: 'mkt.brd@swatiswitchgears.com', password: 'krunal@crm' },
  { name: 'Naim Vora', email: 'sales1@swatiswitchgears.com', password: 'Naim@crm' },
  { name: 'Jay Pandya', email: 'sales2@swatiswitchgears.com', password: 'Jay@crm' },
  { name: 'Hasmukh Chauhan', email: 'hasmukh@swatiswitchgears.com', password: 'Hasmukh@crm' },
  { name: 'VAIBHAVI PATEL', email: 'sales.ahd@swatiswitchgears.com', password: 'VAIBHAVI@crm' },
  { name: 'Atish Shah', email: 'automation.sales@swatiswitchgears.com', password: 'Atish@crm' },
  { name: 'Kanubhai Shah', email: 'kss@swatiswitchgears.com', password: 'Kanubhai@crm' },
  { name: 'Samir Jha', email: 'samir@swatiswitchgears.com', password: 'Samir@crm' },
  // Baroda
  { name: 'Rajeshree Parmar', email: 'sales.brd1@swatiswitchgears.com', password: 'Rajeshree@crm' },
  { name: 'Jagruti Parmar', email: 'sales.brd2@swatiswitchgears.com', password: 'Jagruti@crm' },
  { name: 'Monali Pateliya', email: 'sales.brd4@swatiswitchgears.com', password: 'Monali@crm' },
  { name: 'Bhavesh Prajapati', email: 'sales.brd5@swatiswitchgears.com', password: 'Bhavesh@crm' },
  { name: 'Tajammul Solkar', email: 'Sales.mumbai@swatiswitchgears.com', password: 'Tajammul@crm' },
  { name: 'Samir Sheth', email: 'samirsheth@swatiswitchgears.com', password: 'Samir@crm' }
];

const slugifyUsername = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || `user-${Date.now()}`

const seed = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB. Seeding users...');
    
    const adminUser = (await userRepository.listAllUsers())[0] || {};
    const companyId = adminUser.companyId || 1;

    for (const u of usersToInsert) {
      const existing = await userRepository.findUserByEmail(u.email);
      if (existing) {
        console.log(`[SKIP] User already exists: ${u.email}`);
        continue;
      }
      
      const passwordHash = await hashPassword(u.password);
      
      let baseUsername = slugifyUsername(u.name || u.email.split('@')[0]);
      let username = baseUsername;
      let counter = 1;
      while (await userRepository.findUserByLogin(username)) {
        username = `${baseUsername}-${counter}`;
        counter++;
      }

      const created = await userRepository.createUser({
        username,
        name: u.name,
        email: u.email,
        passwordHash,
        role: 'user',
        companyId,
        status: 'approved',
        isApproved: true
      });
      console.log(`[OK] Created user: ${created.email} (${created.username})`);
    }

    console.log('Seeding completed.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
};

seed();
