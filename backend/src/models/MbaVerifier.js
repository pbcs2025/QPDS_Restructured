// backend/src/models/MbaVerifier.js
const mongoose = require("mongoose");

const mbaVerifierSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // store hashed if your project uses bcrypt
  department: { type: String, default: "MBA" },
  role: { type: String, default: "verifier" }
});

module.exports = mongoose.model("MbaVerifier", mbaVerifierSchema);
