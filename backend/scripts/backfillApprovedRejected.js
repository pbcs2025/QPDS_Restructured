/*
 Backfill semester and department into ApprovedPaper and RejectedPaper
 using their question_ref -> QuestionPaper document.
 Safe to run multiple times (idempotent updates with $set).
*/

require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/config/mongo');
const ApprovedPaper = require('../src/models/ApprovedPaper');
const RejectedPaper = require('../src/models/RejectedPaper');
const QuestionPaper = require('../src/models/QuestionPaper');

(async () => {
  try {
    await connectToDatabase();

    const fixCollection = async (Model, label) => {
      // Find docs missing semester or department
      const toFix = await Model.find({ $or: [ { semester: { $exists: false } }, { semester: null }, { department: { $exists: false } }, { department: null } ] })
        .select('_id question_ref subject_code semester department')
        .lean();

      console.log(`Found ${toFix.length} ${label} docs to backfill`);
      let updated = 0;

      for (const doc of toFix) {
        if (!doc.question_ref) continue;
        const qp = await QuestionPaper.findById(doc.question_ref).select('semester department').lean();
        if (!qp) continue;

        const update = {};
        if (qp.semester !== undefined && qp.semester !== null) update.semester = qp.semester;
        if (qp.department) update.department = qp.department;

        if (Object.keys(update).length) {
          await Model.updateOne({ _id: doc._id }, { $set: update });
          updated += 1;
        }
      }

      console.log(`Backfilled ${updated} ${label} docs`);
    };

    await fixCollection(ApprovedPaper, 'ApprovedPaper');
    await fixCollection(RejectedPaper, 'RejectedPaper');

    console.log('Backfill complete.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Backfill error:', err);
    process.exit(1);
  }
})();
