const user = require('./verifier/user');
const papers = require('./verifier/papers');
const updates = require('./verifier/updates');
const docx = require('./verifier/docx');

module.exports = {
  ...user,
  ...papers,
  ...updates,
  ...docx
};