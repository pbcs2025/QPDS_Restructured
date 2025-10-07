/*
  Backfill QuestionPapers.department and verifierId for existing records.
  Usage: node scripts/backfillQuestionPapers.js
*/

require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/config/mongo');

const QuestionPaper = require('../src/models/QuestionPaper');
const Subject = require('../src/models/Subject');
const Verifier = require('../src/models/Verifier');

async function resolveDepartmentAndVerifier(inputDepartment) {
  if (!inputDepartment) {
    return { department: null, verifierId: null };
  }

  let verifier = await Verifier.findOne({ department: inputDepartment }).lean();
  if (verifier) return { department: verifier.department, verifierId: verifier._id };

  verifier = await Verifier.findOne({ department: { $regex: `^${inputDepartment}$`, $options: 'i' } }).lean();
  if (verifier) return { department: verifier.department, verifierId: verifier._id };

  const words = String(inputDepartment)
    .split(/\s+/)
    .filter(w => !/^and$/i.test(w) && !/^of$/i.test(w) && w.trim().length > 0);
  const initials = words.map(w => w[0].toUpperCase()).join('');
  if (initials) {
    verifier = await Verifier.findOne({ department: { $regex: `^${initials}$`, $options: 'i' } }).lean();
    if (verifier) return { department: verifier.department, verifierId: verifier._id };
  }

  return { department: inputDepartment, verifierId: null };
}

async function main() {
  await connectToDatabase();

  const cursor = QuestionPaper.find({ $or: [ { department: { $exists: false } }, { department: null }, { verifierId: { $exists: false } }, { verifierId: null } ] }).cursor();

  let updated = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      let dept = doc.department;
      if (!dept && doc.subject_code) {
        const subj = await Subject.findOne({ subject_code: doc.subject_code }).lean();
        if (subj && subj.department) dept = subj.department;
      }

      const { department, verifierId } = await resolveDepartmentAndVerifier(dept);

      const update = {};
      if (department && doc.department !== department) update.department = department;
      if (verifierId && String(doc.verifierId || '') !== String(verifierId)) update.verifierId = verifierId;

      if (!update.verifierId && !doc.verifierId && department) {
        const v = await Verifier.findOne({ department }).lean();
        if (v) update.verifierId = v._id;
      }

      if (Object.keys(update).length > 0) {
        await QuestionPaper.updateOne({ _id: doc._id }, { $set: update });
        updated += 1;
        console.log(`Updated ${doc._id}:`, update);
      }
    } catch (err) {
      console.error(`Failed updating ${doc._id}:`, err.message);
    }
  }

  console.log(`\nDone. Updated ${updated} documents.`);
  await mongoose.connection.close();
}

main().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
