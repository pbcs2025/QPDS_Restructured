/* eslint-disable no-console */
const { connectToDatabase } = require('../src/config/mongo');
const User = require('../src/models/User');
const Verifier = require('../src/models/Verifier');

function randStr(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  await connectToDatabase();

  const samples = [
    { department: 'CSE', email: 'cse-admin@example.com' },
    { department: 'ECE', email: 'ece-admin@example.com' },
    { department: 'ME', email: 'me-admin@example.com' },
  ];

  for (const s of samples) {
    const exists = await Verifier.findOne({ department: s.department }).lean();
    if (exists) {
      console.log(`Skipping ${s.department} - already has verifier`);
      continue;
    }

    const username = `${s.department}-Admin${randStr(3)}`;
    const password = randStr(8);

    const user = await User.create({
      name: username,
      username,
      clgName: '-',
      deptName: s.department,
      email: s.email,
      phoneNo: '',
      password,
      usertype: 'admin',
      role: 'Verifier',
    });

    await Verifier.create({
      verifierId: user._id,
      username,
      passwordHash: password,
      department: s.department,
      email: s.email,
      role: 'verifier',
    });

    console.log(`Created verifier for ${s.department}: ${username} / ${password}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


