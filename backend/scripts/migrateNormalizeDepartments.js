const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Faculty = require('../src/models/Faculty');
const Department = require('../src/models/Department');

async function connect() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/qpds_restructing';
  await mongoose.connect(uri, { dbName: 'GAT_QPDS' });
}

async function main() {
  await connect();

  // Build map from department id -> name and name -> name for normalization
  const depts = await Department.find({}).lean();
  const idToName = new Map();
  const nameToName = new Map();
  for (const d of depts) {
    idToName.set(String(d._id), d.name);
    nameToName.set(d.name, d.name);
  }

  let usersUpdated = 0;
  let facultiesUpdated = 0;

  // Normalize users.deptName: if it looks like an ObjectId string that exists, replace with department name
  const users = await User.find({}).lean();
  for (const u of users) {
    // prefer deptName; if missing, try to infer from faculties record
    let current = u.deptName;
    if (!current) {
      const fac = await Faculty.findOne({ facultyId: u._id }).lean();
      if (fac && fac.department) current = fac.department;
    }
    if (!current) continue;
    let normalized = current;
    if (idToName.has(String(current))) {
      normalized = idToName.get(String(current));
    }
    // else if already a name in lookup, keep as-is
    if (normalized !== current) {
      await User.updateOne({ _id: u._id }, { $set: { deptName: normalized } });
      usersUpdated++;
    }
    // Always ensure deptName is set when we could infer
    if (!u.deptName && normalized) {
      await User.updateOne({ _id: u._id }, { $set: { deptName: normalized } });
      usersUpdated++;
    }
  }

  // Normalize faculties.department similarly
  const faculties = await Faculty.find({}).lean();
  for (const f of faculties) {
    const current = f.department;
    if (!current) continue;
    let normalized = current;
    if (idToName.has(String(current))) {
      normalized = idToName.get(String(current));
    }
    if (normalized !== current) {
      await Faculty.updateOne({ _id: f._id }, { $set: { department: normalized } });
      facultiesUpdated++;
    }
  }

  console.log(`Users updated: ${usersUpdated}`);
  console.log(`Faculties updated: ${facultiesUpdated}`);

  await mongoose.connection.close();
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };


