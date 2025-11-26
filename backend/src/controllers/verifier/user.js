const {
    mongoose,
    User,
    Verifier,
    Department,
    generateRandomAlphanumeric
  } = require('./helpers');
  
  async function register(req, res) {
    try {
      const { department, email, verifierName } = req.body;
      if (!department) return res.status(400).json({ error: 'department is required' });
  
      // Canonicalize department to match active Department names
      const active = await Department.find({ isActive: true }).select('name').lean();
      const byLower = new Map(active.map(d => [String(d.name).toLowerCase().trim(), d.name]));
      const canonicalDept = byLower.get(String(department).toLowerCase().trim());
      if (!canonicalDept) {
        return res.status(400).json({ error: 'Invalid department. Choose from active departments.' });
      }
  
      // Build department abbreviation from uppercase letters
      const abbrMatch = String(canonicalDept).match(/[A-Z]/g) || [];
      const deptAbbr = abbrMatch.join('') || canonicalDept.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  
      // Count how many verifiers already exist for this department
      const countForDept = await Verifier.countDocuments({ department: canonicalDept });
      const nextId = countForDept + 1;
      const usernameBase = `${deptAbbr}Adminid${nextId}`;
  
      const randomSuffix = generateRandomAlphanumeric(3);
      const username = usernameBase;
      const password = generateRandomAlphanumeric(8);
  
      const user = await User.create({
        name: verifierName && String(verifierName).trim() ? String(verifierName).trim() : username,
        username,
        clgName: '-',
        deptName: canonicalDept,
        email: email || `${username}@example.com`,
        phoneNo: '',
        password,
        usertype: 'admin',
        role: 'Verifier',
      });
  
      await Verifier.create({
        verifierId: user._id,
        verifierName: verifierName && String(verifierName).trim() ? String(verifierName).trim() : undefined,
        username,
        passwordHash: password,
        department: canonicalDept,
        email: email || '',
        role: 'verifier',
      });
  
      return res.status(201).json({ message: 'Verifier created', credentials: { username, password } });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: 'Username already exists, please retry' });
      }
      console.error('Verifier register error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Danger: delete all verifiers and associated verifier users
  async function deleteAll(_req, res) {
    try {
      const verifiers = await Verifier.find({}).select('verifierId').lean();
      const userIds = verifiers.map(v => v.verifierId).filter(Boolean);
  
      const delVerifiers = await Verifier.deleteMany({});
      let delUsers = { deletedCount: 0 };
      if (userIds.length > 0) {
        delUsers = await User.deleteMany({ _id: { $in: userIds } });
      }
  
      return res.json({ success: true, verifiersDeleted: delVerifiers.deletedCount || 0, usersDeleted: delUsers.deletedCount || 0 });
    } catch (err) {
      console.error('Verifier deleteAll error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  async function login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

      // Import verifier models lazily to avoid circular deps
      const MbaVerifier = require('../../models/MbaVerifier');
      const MtechVerifier = require('../../models/MtechVerifier');

      let found = null;
      let source = 'Verifier';

      // Prefer dedicated Verifier accounts first
      const ver = await Verifier.findOne({ username }).lean();
      if (ver) {
        // Verifier stores password in passwordHash as plain text in this app
        found = { username: ver.username, password: ver.passwordHash, role: 'Verifier', department: ver.department || '' };
        source = 'Verifier';
      }

      // 2) MBA verifier
      if (!found) {
        const mba = await MbaVerifier.findOne({ username }).lean();
        if (mba) {
          found = { username: mba.username, password: mba.password, role: 'Verifier', department: mba.department || 'MBA' };
          source = 'MbaVerifier';
        }
      }

      // 3) MTECH verifier
      if (!found) {
        const mtech = await MtechVerifier.findOne({ username }).lean();
        if (mtech) {
          found = { username: mtech.username, password: mtech.password, role: 'Verifier', department: mtech.department || 'MTECH' };
          source = 'MtechVerifier';
        }
      }

      // 4) Fallback to general User collection (may include Faculty/Admin)
      if (!found) {
        const user = await User.findOne({ username }).lean();
        if (user) {
          found = { username: user.username, password: user.password, role: user.role || user.usertype || 'User', department: user.deptName || '' };
          source = 'User';
        }
      }

      if (!found) {
        return res.status(400).json({ message: 'Invalid username' });
      }

      // Plain text password comparison
      if (String(found.password) !== String(password)) {
        return res.status(400).json({ message: 'Invalid password' });
      }

      // Store user in session if available, otherwise attach to req.user
      const sessionUser = { username: found.username, role: found.role, department: found.department };
      if (req.session) {
        req.session.user = sessionUser;
      }
      req.user = sessionUser;

      return res.json({
        message: 'Login successful',
        username: found.username,
        role: found.role,
        department: found.department,
        source
      });
    } catch (err) {
      console.error('Verifier login error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
  
  async function getById(req, res) {
    try {
      const { id } = req.params;
      const verifier = await Verifier.findById(id).lean();
      if (!verifier) return res.status(404).json({ error: 'Verifier not found' });
      return res.json(verifier);
    } catch (err) {
      console.error('Verifier getById error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  async function listAll(_req, res) {
    try {
      const rows = await Verifier.find({}).sort({ department: 1 }).lean();
      return res.json(rows);
    } catch (err) {
      console.error('Verifier listAll error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  async function removeOne(req, res) {
    try {
      const { verifierId } = req.params;
      if (!verifierId) {
        return res.status(400).json({ error: 'verifierId is required' });
      }
  
      let verifier = null;
      if (mongoose.Types.ObjectId.isValid(verifierId)) {
        // Try by Verifier _id or by stored verifierId (linked User _id)
        verifier = await Verifier.findOne({
          $or: [
            { _id: new mongoose.Types.ObjectId(verifierId) },
            { verifierId: new mongoose.Types.ObjectId(verifierId) },
          ],
        }).lean();
      }
      if (!verifier) {
        // Fallback: try direct match on verifierId field (string form)
        verifier = await Verifier.findOne({ verifierId }).lean();
      }
  
      if (!verifier) {
        return res.status(404).json({ error: 'Verifier not found' });
      }
  
      // Delete the verifier document
      await Verifier.deleteOne({ _id: verifier._id });
  
      // Delete the linked user if present
      if (verifier.verifierId) {
        const linkedId = mongoose.Types.ObjectId.isValid(verifier.verifierId)
          ? new mongoose.Types.ObjectId(verifier.verifierId)
          : verifier.verifierId;
        await User.deleteOne({ _id: linkedId });
      }
  
      return res.json({ success: true, message: 'Verifier and linked user deleted successfully.' });
    } catch (err) {
      console.error('Verifier removeOne error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Normalize all Verifier.department values to match active Department names exactly
  // - Case-insensitive matching against active department names
  // - Only updates when a canonical match is found and value differs by case/spacing
  // - Returns a summary of updates
  async function normalizeDepartments(_req, res) {
    try {
      const activeDepts = await Department.find({ isActive: true }).select('name').lean();
      const canonicalByLower = new Map(activeDepts.map(d => [String(d.name).toLowerCase().trim(), d.name]));
  
      const verifiers = await Verifier.find({}).select('_id department').lean();
  
      const bulkOps = [];
      let matched = 0;
      let alreadyCanonical = 0;
      let skipped = 0;
  
      for (const v of verifiers) {
        const current = (v.department || '').trim();
        const key = current.toLowerCase();
        const canonical = canonicalByLower.get(key);
        if (!canonical) {
          skipped++;
          continue;
        }
        if (current === canonical) {
          alreadyCanonical++;
          continue;
        }
        matched++;
        bulkOps.push({
          updateOne: {
            filter: { _id: v._id },
            update: { $set: { department: canonical } },
          }
        });
      }
  
      let modifiedCount = 0;
      if (bulkOps.length > 0) {
        const result = await Verifier.bulkWrite(bulkOps);
        modifiedCount = result.modifiedCount || 0;
      }
  
      return res.json({
        totalVerifiers: verifiers.length,
        activeDepartments: activeDepts.length,
        updatesPlanned: matched,
        updated: modifiedCount,
        alreadyCanonical,
        skippedNoMatch: skipped,
      });
    } catch (err) {
      console.error('Verifier normalizeDepartments error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  module.exports = {
    register,
    deleteAll,
    login,
    getById,
    listAll,
    removeOne,
    normalizeDepartments
  };