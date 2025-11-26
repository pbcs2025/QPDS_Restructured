// backend/src/models/MtechVerifier.js
const mongoose = require("mongoose");

const mtechVerifierSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, default: "MTECH" },
  role: { type: String, default: "verifier" }
});

module.exports = mongoose.model("MtechVerifier", mtechVerifierSchema);
