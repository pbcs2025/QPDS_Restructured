const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../models/User'); // Adjust path as needed
const Verifier = require('../../models/Verifier');
const QuestionPaper = require('../../models/QuestionPaper');
const ApprovedPaper = require('../../models/ApprovedPaper');
const RejectedPaper = require('../../models/RejectedPaper');
const VerifierCorrectedQuestions = require('../../models/VerifierCorrectedQuestions');
const Department = require('../../models/Department');

// DOCX import with better error handling
let Document, Packer, Paragraph, TextRun;
try {
  const docxModule = require('docx');
  Document = docxModule.Document;
  Packer = docxModule.Packer;
  Paragraph = docxModule.Paragraph;
  TextRun = docxModule.TextRun;
  console.log('DOCX module loaded successfully');
} catch (e) {
  console.error('Failed to load DOCX module:', e.message);
  Document = null;
  Packer = null;
  Paragraph = null;
  TextRun = null;
}

function generateRandomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars[idx];
  }
  return result;
}

module.exports = {
  crypto,
  mongoose,
  User,
  Verifier,
  QuestionPaper,
  ApprovedPaper,
  RejectedPaper,
  VerifierCorrectedQuestions,
  Department,
  Document,
  Packer,
  Paragraph,
  TextRun,
  generateRandomAlphanumeric
};