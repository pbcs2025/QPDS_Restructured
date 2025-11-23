/* eslint-disable no-console */
require('dotenv').config();
const { connectToDatabase } = require('../src/config/mongo');
const MbaVerifier = require('../src/models/MbaVerifier');
const MtechVerifier = require('../src/models/MtechVerifier');

async function main() {
  await connectToDatabase();

  const mbaCreds = {
    username: 'mba.verifier@gat.ac.in',
    password: 'mba123',
    department: 'Master of Business Administration (MBA)',
    role: 'Verifier',
  };

  const mtechCreds = {
    username: 'mtech.verifier@gat.ac.in',
    password: 'mtech123',
    department: 'Master of Technology (MTECH)',
    role: 'Verifier',
  };

  const mbaExisting = await MbaVerifier.findOne({ username: mbaCreds.username }).lean();
  if (!mbaExisting) {
    await MbaVerifier.create(mbaCreds);
    console.log(`✅ MBA verifier created: ${mbaCreds.username} / ${mbaCreds.password}`);
  } else {
    console.log('ℹ️ MBA verifier already exists, skipping');
  }

  const mtechExisting = await MtechVerifier.findOne({ username: mtechCreds.username }).lean();
  if (!mtechExisting) {
    await MtechVerifier.create(mtechCreds);
    console.log(`✅ MTECH verifier created: ${mtechCreds.username} / ${mtechCreds.password}`);
  } else {
    console.log('ℹ️ MTECH verifier already exists, skipping');
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });