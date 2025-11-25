/* eslint-disable no-console */
const {
    QuestionPaper,
    ApprovedPaper,
    VerifierCorrectedQuestions,
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
  } = require('./helpers');
  
  // THIN BUT VISIBLE BORDERS (for all tables)
  const BORDER = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };
  
  // TEST ENDPOINT
  async function testDocxGeneration(req, res) {
    try {
      if (!Packer) return res.status(501).json({ error: 'DOCX not available' });
  
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ children: [new TextRun({ text: 'TEST: Thin borders + USN boxes', bold: true, size: 36 })] }),
            new Table({
              rows: [
                new TableRow({
                  children: Array.from({ length: 10 }, () =>
                    new TableCell({
                      width: { size: 800, type: WidthType.DXA },
                      borders: BORDER,
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '□', size: 48, bold: true })]
                      })]
                    })
                  )
                })
              ],
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          ]
        }]
      });
  
      const buf = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="test.docx"');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', Buffer.byteLength(buf));
      return res.end(buf);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }
  
  // MAIN FUNCTION
  async function getPaperDocx(req, res) {
    try {
      if (!Packer) return res.status(501).json({ error: 'DOCX generation not available' });
  
      const { subject_code, semester } = req.params;
      const sem = Number(semester);
      if (!subject_code || Number.isNaN(sem))
        return res.status(400).json({ error: 'Invalid parameters' });
  
      let papers = await QuestionPaper.find({ subject_code, semester: sem }).sort({ question_number: 1 }).lean();
      if (!papers?.length) {
        const approved = await ApprovedPaper.find({ subject_code, semester: sem }).sort({ question_number: 1 }).lean();
        if (approved?.length) papers = approved;
      }
  
      if (papers?.length) {
        const corr = await VerifierCorrectedQuestions.findOne({ subject_code, semester: sem }).lean();
        if (corr?.corrected_questions) {
          papers = papers.map(p => {
            const c = corr.corrected_questions.find(q => q.question_number === p.question_number);
            if (!c) return p;
            return {
              ...p,
              question_text: c.corrected_question_text ?? p.question_text,
              co: c.corrected_co ?? p.co,
              level: c.corrected_l ?? p.level,
              marks: c.corrected_marks ?? p.marks,
              remarks: c.remarks ?? p.remarks,
            };
          });
        }
      }
  
      if (!papers?.length) return res.status(404).json({ error: 'Paper not found' });
  
      const sanitize = (val) => {
        const s = String(val == null ? '' : val);
        // Remove disallowed XML control characters and unpaired surrogates
        return s
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
          .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ' ');
      };

      const dept = sanitize(papers[0].department || 'N/A');
  
      // USN: 10 visible boxes in a single row
      const usnTable = new Table({
        rows: [
          new TableRow({
            children: Array.from({ length: 10 }, () =>
              new TableCell({
                width: { size: 800, type: WidthType.DXA },
                borders: BORDER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: '□',
                        size: 48,
                        bold: true,
                        font: 'Arial'
                      })
                    ]
                  })
                ]
              })
            )
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
      });
  
  const deptSemPara = new Paragraph({
    children: [
      new TextRun({ text: `Department: ${dept}`, bold: true }),
      new TextRun({ text: ' '.repeat(30) }),
      new TextRun({ text: `Semester: ${sem}`, bold: true }),
    ]
  });
  
      const header = [
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: sanitize(subject_code), bold: true })] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: 'GLOBAL ACADEMY OF TECHNOLOGY, BENGALURU',
            bold: true,
            size: 34
          })]
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '(An Autonomous Institute, affiliated to VTU, Belagavi)' })] }),
  
        // Add a blank line
        new Paragraph({ children: [new TextRun({ text: ' ' })] }),
        
        // Department and Semester line
        new Paragraph({
          children: [
            new TextRun({ text: `Department: ${dept}`, bold: true }),
            new TextRun({ text: ' '.repeat(30) }),
            new TextRun({ text: `Semester: ${sem}`, bold: true }),
          ]
        }),
        
        // USN boxes - 11 columns table (1 for label + 10 for boxes)
        new Table({
          rows: [
            new TableRow({
              height: { value: 600, rule: 'atLeast' },
              children: [
                new TableCell({
                  borders: BORDER,
                  width: { size: 1000, type: WidthType.DXA },
                  children: [new Paragraph({ 
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'USN', bold: true, size: 20 })] 
                  })]
                }),
                ...Array.from({ length: 10 }, () =>
                  new TableCell({
                    borders: BORDER,
                    width: { size: 836, type: WidthType.DXA },
                    children: [new Paragraph({ 
                      alignment: AlignmentType.CENTER, 
                      children: [new TextRun({ text: ' ', size: 24 })] 
                    })]
                  })
                )
              ]
            })
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
        
        new Paragraph({ children: [new TextRun({ text: ' ' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Semester ${sem} B.E. Degree Second Internal Assessment, April – 2025` })] }),
        new Paragraph({ 
          alignment: AlignmentType.CENTER, 
          children: [new TextRun({ text: `Subject Name: ${sanitize(papers[0].subject_name)}`, bold: true, size: 28 })] 
        }),
        new Paragraph({ 
          children: [
            new TextRun({ text: 'Time: 3 hrs.', bold: true }),
            new TextRun({ text: '\t\t\t\t\t\t\t\t' }),
            new TextRun({ text: 'Max. Marks: 100', bold: true })
          ]
        }),
        new Paragraph({ children: [new TextRun({ text: 'Note: Answer any five full questions, choosing ONE full question from each module.', italics: true })] }),
        new Paragraph({ children: [new TextRun({ text: ' ' })] }),
      ];
  
      const qRows = [];
  
      // Table Header
      qRows.push(
        new TableRow({
          children: [
            new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, borders: BORDER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Q. No.', bold: true })] })] }),
            new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, borders: BORDER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Question', bold: true })] })] }),
            new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: BORDER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Marks / CO / Level', bold: true })] })] }),
          ]
        })
      );
  
      // Group questions by main Q number (e.g., 1, 1a, 1b → group under 1)
      const grouped = {};
      papers.forEach(q => {
        const mainQ = String(q.question_number).split(/[a-z]$/i)[0]; // e.g., "1a" → "1"
        if (!grouped[mainQ]) grouped[mainQ] = [];
        grouped[mainQ].push(q);
      });
  
      // Determine module structure (questions 1-2 = Module 1, 3-4 = Module 2, etc.)
      const getModuleNumber = (questionNum) => {
        const num = parseInt(questionNum);
        return Math.ceil(num / 2);
      };
      
      let currentModule = 0;
      
      Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b)).forEach((mainQ, groupIndex, arr) => {
        const subQuestions = grouped[mainQ];
        const questionNum = parseInt(mainQ);
        const moduleNum = getModuleNumber(questionNum);
        
        // Add module header if this is a new module
        if (moduleNum !== currentModule) {
          currentModule = moduleNum;
          qRows.push(
            new TableRow({
              children: [
                new TableCell({ 
                  borders: BORDER, 
                  columnSpan: 3,
                  children: [new Paragraph({ 
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Module ${moduleNum}`, bold: true, size: 24 })] 
                  })] 
                }),
              ]
            })
          );
        }
  
        subQuestions.forEach((q, subIndex) => {
          const marks = typeof q.marks === 'number' ? q.marks : 0;
          const co = sanitize(q.co ?? '');
          const level = sanitize(q.level ?? '');
          const info = `${marks} / ${co} / ${level}`;
  
          qRows.push(
            new TableRow({
              children: [
                new TableCell({ borders: BORDER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sanitize(q.question_number) })] })] }),
                new TableCell({ borders: BORDER, children: [new Paragraph({ children: [new TextRun({ text: sanitize(q.question_text) })] })] }),
                new TableCell({ borders: BORDER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: info })] })] }),
              ]
            })
          );
        });
  
        // Add OR separator between odd and even questions in the same module
        const nextQuestionNum = groupIndex < arr.length - 1 ? parseInt(arr[groupIndex + 1]) : null;
        const nextModuleNum = nextQuestionNum ? getModuleNumber(nextQuestionNum) : null;
        
        if (questionNum % 2 === 1 && nextModuleNum === moduleNum) {
          // Add OR row between question 1 and 2, 3 and 4, etc.
          qRows.push(
            new TableRow({
              children: [
                new TableCell({ 
                  borders: BORDER, 
                  columnSpan: 3,
                  children: [new Paragraph({ 
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'OR', bold: true, size: 22 })] 
                  })] 
                }),
              ]
            })
          );
        }
      });
  
      const questionTable = new Table({
        rows: qRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4 },
          bottom: { style: BorderStyle.SINGLE, size: 4 },
          left: { style: BorderStyle.SINGLE, size: 4 },
          right: { style: BorderStyle.SINGLE, size: 4 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4 },
          insideVertical: { style: BorderStyle.SINGLE, size: 4 }
        },
      });
  
      // Heuristic: if many rows, likely more than one page → add P.T.O footer
      const likelyMultiPage = qRows.length > 22;
  
      const docSections = [{
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: [...header, questionTable],
      }];

      if (likelyMultiPage) {
        const { Footer, Paragraph: P, TextRun: T } = require('./helpers');
        docSections[0].footers = {
          default: new Footer({
            children: [
              new P({ alignment: AlignmentType.RIGHT, children: [new T({ text: 'P.T.O', bold: true })] })
            ]
          })
        };
      }

      const doc = new Document({ sections: docSections });
  
      const buffer = await Packer.toBuffer(doc);
      const filename = `${subject_code}_${sem}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', Buffer.byteLength(buffer));
      return res.end(buffer);
    } catch (err) {
      console.error('getPaperDocx error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
  
  module.exports = { testDocxGeneration, getPaperDocx };