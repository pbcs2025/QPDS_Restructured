const crypto = require('crypto');
const User = require('../models/User');
const Verifier = require('../models/Verifier');

function generateRandomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars[idx];
  }
  return result;
}

exports.register = async (req, res) => {
  try {
    const { department, email } = req.body;
    if (!department) return res.status(400).json({ error: 'department is required' });

    const existing = await Verifier.findOne({ department }).lean();
    if (existing) return res.status(409).json({ error: 'Verifier already exists for this department' });

    const randomSuffix = generateRandomAlphanumeric(3);
    const username = `${department}-Admin${randomSuffix}`;
    const password = generateRandomAlphanumeric(8);

    const user = await User.create({
      name: username,
      username,
      clgName: '-',
      deptName: department,
      email: email || `${username}@example.com`,
      phoneNo: '',
      password,
      usertype: 'admin',
      role: 'Verifier',
    });

    await Verifier.create({
      verifierId: user._id,
      username,
      passwordHash: password,
      department,
      email: email || '',
      role: 'verifier',
    });

    return res.status(201).json({ message: 'Verifier created', credentials: { username, password } });
  } catch (err) {
    console.error('Verifier register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

    const user = await User.findOne({ username, password, role: 'Verifier' }).lean();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const verifier = await Verifier.findOne({ username }).lean();
    return res.json({ success: true, verifier });
  } catch (err) {
    console.error('Verifier login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const verifier = await Verifier.findById(id).lean();
    if (!verifier) return res.status(404).json({ error: 'Verifier not found' });
    return res.json(verifier);
  } catch (err) {
    console.error('Verifier getById error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.listAll = async (_req, res) => {
  try {
    const rows = await Verifier.find({}).sort({ department: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    console.error('Verifier listAll error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};


