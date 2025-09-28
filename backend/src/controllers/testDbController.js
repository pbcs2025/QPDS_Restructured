const mongoose = require('mongoose');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const QuestionPaper = require('../models/QuestionPaper');
const Verification = require('../models/Verification');
const Notification = require('../models/Notification');
const Department = require('../models/Department');

async function ensureDepartmentsSeeded() {
  const count = await Department.countDocuments();
  if (count > 0) return { seeded: false, count };
  const names = [
    'Computer Science & Engineering',
    'Electronics and Communication Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Information Science & Engineering',
  ];
  await Department.insertMany(names.map(name => ({ name, isActive: true })));
  const newCount = await Department.countDocuments();
  return { seeded: true, count: newCount };
}

exports.testDb = async (_req, res) => {
  try {
    const connectionState = mongoose.connection.readyState; // 1=connected
    const connected = connectionState === 1;

    const models = { User, Subject, Assignment, QuestionPaper, Verification, Notification, Department };
    const report = {};
    for (const [name, model] of Object.entries(models)) {
      try {
        const count = await model.estimatedDocumentCount();
        report[name] = { exists: true, count };
      } catch (e) {
        report[name] = { exists: false, count: 0, error: e.message };
      }
    }

    // Optional seed if Department empty
    let seedInfo = null;
    if (report.Department && report.Department.count === 0) {
      seedInfo = await ensureDepartmentsSeeded();
      report.Department.count = seedInfo.count;
    }

    res.json({ connected, report, seedInfo });
  } catch (err) {
    res.status(500).json({ error: 'Test DB failed', details: err.message });
  }
};







