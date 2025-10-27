const {
    QuestionPaper,
    ApprovedPaper,
    VerifierCorrectedQuestions,
    Document,
    Packer,
    Paragraph,
    TextRun
  } = require('./helpers');
  
  // Test DOCX generation endpoint
  async function testDocxGeneration(req, res) {
    try {
      console.log('Testing DOCX generation...');
      
      if (!Packer) {
        console.error('Packer not available');
        return res.status(501).json({ error: 'DOCX generation not available on server' });
      }
      
      // Create a simple test document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Test Document",
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "This is a test to verify DOCX generation is working.",
                  }),
                ],
              }),
            ],
          },
        ],
      });
  
      const buffer = await Packer.toBuffer(doc);
      const filename = 'test.docx';
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.send(Buffer.from(buffer));
    } catch (err) {
      console.error('Test DOCX generation error:', err);
      return res.status(500).json({ 
        error: 'Server error', 
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
  
  // Generate a DOCX for a paper
  async function getPaperDocx(req, res) {
    try {
      console.log('getPaperDocx called with params:', req.params);
      
      if (!Packer) {
        console.error('Packer not available - DOCX generation not available on server');
        return res.status(501).json({ error: 'DOCX generation not available on server' });
      }
      
      const { subject_code, semester } = req.params;
      const sem = parseInt(semester);
      
      console.log('Looking for papers with:', { subject_code, semester: sem });
      
      // First try to find papers in QuestionPaper collection
      let papers = await QuestionPaper.find({ subject_code, semester: sem }).sort({ question_number: 1 }).lean();
      console.log('Found papers in QuestionPaper:', papers.length);
      
      // If not found, try to find in ApprovedPaper collection
      if (!papers || papers.length === 0) {
        console.log('No papers found in QuestionPaper, checking ApprovedPaper...');
        const approvedPapers = await ApprovedPaper.find({ subject_code, semester: sem }).sort({ question_number: 1 }).lean();
        console.log('Found papers in ApprovedPaper:', approvedPapers.length);
        if (approvedPapers && approvedPapers.length > 0) {
          papers = approvedPapers;
        }
      }
  
      // Check for corrected questions from verifier
      if (papers && papers.length > 0) {
        console.log('Checking for verifier corrected questions...');
        const correctedQuestions = await VerifierCorrectedQuestions.findOne({
          subject_code,
          semester: sem
        }).lean();
        
        if (correctedQuestions && correctedQuestions.corrected_questions) {
          console.log('Found corrected questions, merging with original papers...');
          // Merge corrected questions with original papers
          papers = papers.map(paper => {
            const corrected = correctedQuestions.corrected_questions.find(
              cq => cq.question_number === paper.question_number
            );
            if (corrected) {
              return {
                ...paper,
                corrected_question_text: corrected.corrected_question_text,
                corrected_co: corrected.corrected_co,
                corrected_l: corrected.corrected_l,
                corrected_marks: corrected.corrected_marks,
                remarks: corrected.remarks || paper.remarks
              };
            }
            return paper;
          });
          console.log('Merged corrected questions with original papers');
        }
      }
      
      if (!papers || papers.length === 0) {
        console.log('No papers found in any collection');
        return res.status(404).json({ error: 'Paper not found' });
      }
  
      console.log('Using papers for DOCX generation:', papers.length, 'questions');
      console.log('First paper sample:', {
        subject_code: papers[0].subject_code,
        subject_name: papers[0].subject_name,
        semester: papers[0].semester,
        question_number: papers[0].question_number
      });
  
      // Validate that all required fields are present
      for (let i = 0; i < papers.length; i++) {
        const paper = papers[i];
        if (!paper.question_text || !paper.question_number) {
          console.error(`Invalid paper data at index ${i}:`, paper);
          throw new Error(`Invalid paper data: missing question_text or question_number`);
        }
      }
  
      // Create USN boxes
      const usnBoxes = [];
      for (let i = 0; i < 10; i++) {
        usnBoxes.push(
          new TextRun({
            text: "□",
            size: 36,
          })
        );
      }
  
      // Create document sections
      const header = [
        // Subject Code - Top Right
        new Paragraph({
          alignment: "right",
          children: [new TextRun({ text: `${subject_code}`, bold: true })]
        }),
        
        // College Header
        new Paragraph({
          alignment: "center",
          children: [new TextRun({ text: "GLOBAL ACADEMY OF TECHNOLOGY, BENGALURU", bold: true })]
        }),
        new Paragraph({
          alignment: "center",
          children: [new TextRun({ text: "(An Autonomous Institute, affiliated to VTU, Belagavi)" })]
        }),
        
        // USN Section
        new Paragraph({
          children: [
            new TextRun({ text: "USN: ", bold: true }),
            ...usnBoxes
          ]
        }),
        
        // Exam Information
        new Paragraph({
          alignment: "center",
          children: [new TextRun({ text: `Semester ${sem} B.E. Degree Second Internal Assessment, April – 2025` })]
        }),
        new Paragraph({
          alignment: "center",
          children: [new TextRun({ text: `Subject Name: ${papers[0].subject_name}`, bold: true })]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Time: 3 hrs.", bold: true }),
            new TextRun({ text: "\t\t\t\t\t\t\t\t" }),
            new TextRun({ text: "Max. Marks: 100", bold: true })
          ]
        }),
        
        // Department and Semester Info
        new Paragraph({
          children: [
            new TextRun({ text: `Department: ${papers[0].department || 'N/A'}`, bold: true }),
            new TextRun({ text: "\t\t\t\t\t\t\t\t" }),
            new TextRun({ text: `Semester: ${sem}`, bold: true })
          ]
        }),
        
        // Note Section
        new Paragraph({
          children: [new TextRun({ text: "Note: Answer any five full questions, choosing ONE full question from each module.", italics: true })]
        }),
        
        // Empty line before table
        new Paragraph({ children: [new TextRun({ text: " " })] }),
      ];
  
      // Create questions as simple paragraphs instead of table
      console.log('Creating questions as paragraphs...');
      const questionParagraphs = [];
      
      papers.forEach((q, index) => {
        console.log(`Creating question ${index + 1}:`, q.question_number);
        
        // Use corrected question text if available, otherwise use original
        const questionText = q.corrected_question_text || q.question_text || '';
        const questionMarks = q.corrected_marks !== undefined ? q.corrected_marks : q.marks;
        const questionCO = q.corrected_co || q.co || '';
        const questionLevel = q.corrected_l || q.l || '';
        
        console.log(`Question ${index + 1} details:`, {
          number: q.question_number,
          text: questionText.substring(0, 50) + '...',
          marks: questionMarks,
          co: questionCO,
          level: questionLevel
        });
        
        // Create question as paragraph
        questionParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Q${q.question_number}. `, bold: true }),
              new TextRun({ text: String(questionText) })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Marks: ${typeof questionMarks === 'number' ? questionMarks : 0} | `, bold: true }),
              new TextRun({ text: `${questionCO} | `, bold: true }),
              new TextRun({ text: `${questionLevel}`, bold: true })
            ]
          }),
          new Paragraph({ children: [new TextRun({ text: " " })] }) // Empty line
        );
      });
  
      console.log('Questions created successfully:', questionParagraphs.length, 'paragraphs');
  
      // Bottom section with asterisks only
      const footer = [
        new Paragraph({ children: [new TextRun({ text: " " })] }),
        new Paragraph({
          alignment: "center",
          children: [new TextRun({ text: "* * * * *" })]
        }),
      ];
  
      // Create the document with simplified structure
      console.log('Creating DOCX document...');
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children: [
              ...header,
              ...questionParagraphs,
              ...footer,
            ],
          },
        ],
      });
      console.log('DOCX document created successfully');
  
      console.log('Generating DOCX buffer...');
      const buffer = await Packer.toBuffer(doc);
      console.log('DOCX buffer generated successfully, size:', buffer.length);
      
      const filename = `${subject_code}_${sem}.docx`;
      console.log('Setting headers for download:', filename);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      console.log('Sending DOCX file to client...');
      return res.send(Buffer.from(buffer));
    } catch (err) {
      console.error('getPaperDocx error:', err);
      console.error('Error details:', err.message);
      console.error('Stack trace:', err.stack);
      return res.status(500).json({ 
        error: 'Server error', 
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
  
  module.exports = {
    testDocxGeneration,
    getPaperDocx
  };