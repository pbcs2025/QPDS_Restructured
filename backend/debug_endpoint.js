const express = require('express');
const mongoose = require('mongoose');
const QuestionPaper = require('./src/models/QuestionPaper');

const app = express();
app.use(express.json());

// Connect to the same database as the main app
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/GAT_QPDS';
mongoose.connect(mongoUri, {
  dbName: 'GAT_QPDS',
});

app.get('/debug-paper/:id', async (req, res) => {
  try {
    const paper = await QuestionPaper.findById(req.params.id).lean();
    res.json({
      found: !!paper,
      data: paper,
      allFields: paper ? Object.keys(paper) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/debug-latest', async (req, res) => {
  try {
    const papers = await QuestionPaper.find({ subject_code: 'TEST002' }).lean();
    res.json({
      count: papers.length,
      papers: papers.map(p => ({
        id: p._id,
        question_number: p.question_number,
        department: p.department,
        co: p.co,
        level: p.level,
        marks: p.marks,
        allFields: Object.keys(p)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log('Test with:');
  console.log(`- http://localhost:${PORT}/debug-latest`);
  console.log(`- http://localhost:${PORT}/debug-paper/{id}`);
});
