// controllers/verifier/helpers.js

const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Verifier = require('../../models/Verifier');
const QuestionPaper = require('../../models/QuestionPaper');
const ApprovedPaper = require('../../models/ApprovedPaper');
const RejectedPaper = require('../../models/RejectedPaper');
const VerifierCorrectedQuestions = require('../../models/VerifierCorrectedQuestions');
const Department = require('../../models/Department');

// DOCX: Safe import with fallback
let Document = null;
let Packer = null;
let Paragraph = null;
let TextRun = null;
let Table = null;
let TableRow = null;
let TableCell = null;
let WidthType = null;
let BorderStyle = null;
let AlignmentType = null;
let Footer = null;

try {
  const docx = require('docx');
  Document = docx.Document;
  Packer = docx.Packer;
  Paragraph = docx.Paragraph;
  TextRun = docx.TextRun;
  Table = docx.Table;
  TableRow = docx.TableRow;
  TableCell = docx.TableCell;
  WidthType = docx.WidthType;
  BorderStyle = docx.BorderStyle;
  AlignmentType = docx.AlignmentType;
  Footer = docx.Footer;
  console.log('DOCX module loaded successfully');
} catch (err) {
  console.error('Failed to load docx module:', err.message);
}

function generateRandomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Export everything
module.exports = {
  // DOCX
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
  Footer,

  // Models
  User,
  Verifier,
  QuestionPaper,
  ApprovedPaper,
  RejectedPaper,
  VerifierCorrectedQuestions,
  Department,

  // Utilities
  crypto,
  mongoose,
  generateRandomAlphanumeric,
};