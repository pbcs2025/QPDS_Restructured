// backend/src/controllers/authController.js
const crypto = require('crypto');
const User = require('../models/User');
const Verification = require('../models/Verification');
const sendEmail = require('../utils/mailer');
const { generateToken } = require('../utils/jwtHelper');
const { logLogin, logLogout } = require('../middleware/activityLogger');

/**
 * Generate a unique username by appending random 3-digit number
 */
async function generateUniqueUsername(baseName) {
  while (true) {
    const rand = Math.floor(100 + Math.random() * 900);
    const username = `${baseName}${rand}`;
    const exists = await User.findOne({ username }).lean();
    if (!exists) return username;
  }
}

function escapeRegex(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Register a new user (Faculty or External)
 * POST /register
 */
exports.register = async (req, res) => {
  try {
    const { username: baseName, clgName, deptName, email, phoneNo, role } = req.body;

    if (!baseName || !clgName || !deptName || !email || !phoneNo) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    const username = await generateUniqueUsername(baseName.toLowerCase());
    const name = baseName;
    const password = crypto.randomBytes(4).toString('hex');

    const user = await User.create({
      name,
      username,
      clgName,
      deptName,
      email,
      phoneNo,
      password,
      usertype: role === 'Faculty' ? 'internal' : 'external',
      role: role || 'Faculty',
    });

    if (role === 'Faculty' || !role) {
      const Faculty = require('../models/Faculty');
      await Faculty.create({
        facultyId: user._id,
        name,
        email,
        passwordHash: password,
        department: deptName,
        clgName,
        contactNumber: phoneNo,
        type: user.usertype,
        role: 'faculty'
      });
    }

    try {
      await sendEmail(
        email,
        'Welcome to GAT Portal',
        '',
        `<p>Hi ${baseName},</p>
        <p>Your account has been created successfully.</p>
        <p><strong>Username:</strong> ${username}<br>
        <strong>Password:</strong> ${password}</p>
        <p>Please change your password after logging in for security.</p>
        <p>Best regards,<br>GAT Portal Team</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.status(201).json({ 
      success: true,
      message: 'Registration successful', 
      credentials: { username, password } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Email or username already exists' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Login user and send verification code via email
 * POST /login
 */
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }

  console.log('🔍 Login attempt:', { username });

  try {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    const user = await User.findOne({ 
      username: trimmedUsername, 
      password: trimmedPassword 
    }).lean();

    if (!user) {
      console.log('❌ Invalid credentials for:', trimmedUsername);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ User authenticated:', user.username, '| Role:', user.role);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Verification.findOneAndUpdate(
      { email: trimmedUsername },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendEmail(
        user.email,
        'Login Verification Code - GAT Portal',
        '',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Login Verification</h2>
          <p>Hello ${user.name},</p>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h1 style="color: #4CAF50; margin: 0; font-size: 36px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p><strong>This code is valid for 10 minutes.</strong></p>
          <p>If you didn't attempt to login, please ignore this email.</p>
          <p>Best regards,<br>GAT Portal Team</p>
        </div>`
      );
      console.log('📧 Verification code sent to:', user.email);
    } catch (err) {
      console.error('❌ Email error:', err.message);
    }

    res.json({ 
      success: true, 
      message: 'Verification code sent to your email' 
    });
  } catch (err) {
    console.error('❌ Error during login:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

/**
 * Verify login code and issue JWT token
 * POST /verify
 */
exports.verify = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and verification code are required' 
    });
  }

  console.log('🔐 Verification attempt for:', email);

  try {
    const rec = await Verification.findOne({ 
      email: email.trim(), 
      code: code.trim() 
    }).lean();

    if (!rec) {
      console.log('❌ Invalid code for:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }

    if (rec.expiresAt < new Date()) {
      console.log('❌ Expired code for:', email);
      await Verification.deleteOne({ email: email.trim() });
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code has expired. Please login again.' 
      });
    }

    const user = await User.findOne({ username: email.trim() }).lean();
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const token = generateToken({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      usertype: user.usertype,
      name: user.name,
      department: user.deptName,
      college: user.clgName
    });

    await Verification.deleteOne({ email: email.trim() });

    console.log('✅ Verification successful for:', user.username);

    // 🔥 LOG LOGIN ACTIVITY
    await logLogin({
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      usertype: user.usertype
    }, req);

    res.json({ 
      success: true, 
      message: 'Verification successful',
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        usertype: user.usertype,
        department: user.deptName,
        college: user.clgName,
        phoneNo: user.phoneNo
      }
    });
  } catch (err) {
    console.error('❌ Error during verification:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

/**
 * Resolve identifier (username/email) to stored role so frontend can pick correct auth flow.
 * POST /resolve-role
 */
exports.resolveRole = async (req, res) => {
  try {
    const identifier = req.body?.identifier;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Identifier (username or email) is required',
      });
    }

    const trimmed = identifier.trim();
    const looksLikeEmail = trimmed.includes('@');

    let user =
      (await User.findOne({ username: trimmed }).lean()) ||
      (await User.findOne({
        username: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
      }).lean());

    if (!user && looksLikeEmail) {
      user = await User.findOne({ email: trimmed.toLowerCase() }).lean();
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found with the provided identifier.',
      });
    }

    const role = user.role || 'Faculty';
    const requiresOtp = role === 'Faculty' || role === 'MBAFaculty';

    return res.json({
      success: true,
      role,
      username: user.username,
      email: user.email,
      usertype: user.usertype,
      name: user.name,
      department: user.deptName,
      clgName: user.clgName,
      requiresOtp,
      isMBA: /^MBA/.test(role),
    });
  } catch (err) {
    console.error('resolveRole error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve role. Please try again later.',
    });
  }
};

/**
 * Forgot password - send current password via email
 * POST /forgot-password
 */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  console.log('🔑 Password recovery request for:', email);

  try {
    const user = await User.findOne({ username: email.trim() }).lean();
    
    if (!user) {
      console.log('❌ User not found for password recovery:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'If this email exists, a password recovery email has been sent.' 
      });
    }

    try {
      await sendEmail(
        user.email,
        'GAT Portal - Password Recovery',
        '',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Recovery</h2>
          <p>Dear ${user.name},</p>
          <p>Your current password is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #FF5722; margin: 0; font-size: 24px; letter-spacing: 2px;">${user.password}</h2>
          </div>
          <p><strong>⚠️ Important:</strong> Please login and change your password immediately for security reasons.</p>
          <p>If you have any questions or face difficulties accessing the system, kindly contact the examination cell at <a href="mailto:support@gat.ac.in">support@gat.ac.in</a>.</p>
          <p>Best regards,<br>
          Examination Cell<br>
          Global Academy of Technology</p>
        </div>`
      );
      console.log('📧 Password recovery email sent to:', user.email);
    } catch (err) {
      console.error('❌ Email error:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send recovery email. Please try again.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Password recovery email sent successfully' 
    });
  } catch (err) {
    console.error('❌ Error during forgot-password:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

/**
 * Reset password - change user password
 * POST /reset-password
 */
exports.resetPassword = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ 
      error: 'Username, old password, and new password are required' 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      error: 'New password must be at least 6 characters long' 
    });
  }

  console.log('🔄 Password reset attempt for:', username);

  try {
    const user = await User.findOne({ 
      username: username.trim(), 
      password: oldPassword.trim() 
    });

    if (!user) {
      console.log('❌ Old password incorrect for:', username);
      return res.status(401).json({ 
        error: 'Old password is incorrect' 
      });
    }

    user.password = newPassword.trim();
    await user.save();

    try {
      const Faculty = require('../models/Faculty');
      await Faculty.updateOne(
        { facultyId: user._id },
        { passwordHash: newPassword.trim() }
      );
    } catch (err) {
      console.error('Note: Faculty record not updated:', err.message);
    }

    console.log('✅ Password updated successfully for:', username);

    try {
      await sendEmail(
        user.email,
        'Password Changed Successfully - GAT Portal',
        '',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Password Changed Successfully</h2>
          <p>Dear ${user.name},</p>
          <p>Your password has been changed successfully.</p>
          <p>If you did not make this change, please contact support immediately at <a href="mailto:support@gat.ac.in">support@gat.ac.in</a>.</p>
          <p>Best regards,<br>GAT Portal Team</p>
        </div>`
      );
    } catch (err) {
      console.error('Email notification error:', err.message);
    }

    res.status(200).json({ 
      success: true,
      message: 'Password updated successfully' 
    });
  } catch (err) {
    console.error('❌ Password update error:', err);
    res.status(500).json({ 
      error: 'Failed to update password. Please try again.' 
    });
  }
};

/**
 * Get all internal users
 * GET /users
 */
exports.getInternalUsers = async (_req, res) => {
  try {
    const users = await User.find({ usertype: 'internal' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`📋 Retrieved ${users.length} internal users`);
    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching internal users:', err);
    res.status(500).json({ 
      error: 'Failed to fetch users' 
    });
  }
};

/**
 * Get all external users
 * GET /externalusers
 */
exports.getExternalUsers = async (_req, res) => {
  try {
    const users = await User.find({ usertype: 'external' })
      .select('-password')
      .sort({ _id: -1 })
      .lean();
    
    console.log(`📋 Retrieved ${users.length} external users`);
    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching external users:', err);
    res.status(500).json({ 
      error: 'Failed to fetch users' 
    });
  }
};

/**
 * Get all colleges
 * GET /colleges
 */
exports.getColleges = async (_req, res) => {
  try {
    const colleges = await User.distinct('clgName');
    const formatted = colleges
      .filter(name => name)
      .map((name, index) => ({ 
        id: index + 1, 
        name 
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`🏫 Retrieved ${formatted.length} colleges`);
    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching colleges:', err);
    res.status(500).json({ 
      error: 'Failed to fetch colleges' 
    });
  }
};

/**
 * Get all departments
 * GET /departments
 */
exports.getDepartments = async (_req, res) => {
  try {
    const departments = await User.aggregate([
      { $match: { deptName: { $exists: true, $ne: '' } } },
      { $group: { _id: '$deptName' } },
      { $project: { 
        id: '$_id', 
        department: '$_id', 
        _id: 0 
      }},
      { $sort: { department: 1 } }
    ]);
    
    console.log(`🏢 Retrieved ${departments.length} departments`);
    res.json(departments);
  } catch (err) {
    console.error('❌ Error fetching departments:', err);
    res.status(500).json({ 
      error: 'Failed to fetch departments' 
    });
  }
};

/**
 * Super Admin Login - direct authentication without verification code
 * POST /superadmin/login
 */
exports.superAdminLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }

  console.log('🔍 Super Admin login attempt:', { username });

  try {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') },
      password: trimmedPassword,
      role: 'SuperAdmin'
    }).lean();

    if (!user) {
      console.log('❌ Invalid Super Admin credentials for:', trimmedUsername);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid Super Admin credentials' 
      });
    }

    console.log('✅ Super Admin authenticated:', user.username);

    const token = generateToken({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      usertype: user.usertype,
      name: user.name,
      department: user.deptName,
      college: user.clgName
    });

    // 🔥 LOG LOGIN ACTIVITY
    await logLogin({
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      usertype: user.usertype
    }, req);

    res.json({ 
      success: true, 
      message: 'Super Admin login successful',
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        usertype: user.usertype,
        department: user.deptName,
        college: user.clgName,
        phoneNo: user.phoneNo
      }
    });
  } catch (err) {
    console.error('❌ Error during Super Admin login:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

/**
 * Register a new faculty member
 * POST /registerFaculty
 */
exports.registerFaculty = async (req, res) => {
  const { name, clgName, departmentId, email, phone, usertype } = req.body;

  if (!name || !clgName || !departmentId || !email || !phone || !usertype) {
    return res.status(400).json({ 
      error: 'All fields are required' 
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format' 
    });
  }

  console.log('👤 Registering new faculty:', email);

  try {
    const password = crypto.randomBytes(4).toString('hex');

    const user = await User.create({
      name: name.trim(),
      username: email.trim().toLowerCase(),
      clgName: clgName.trim(),
      deptName: departmentId,
      email: email.trim(),
      phoneNo: phone.trim(),
      usertype,
      role: 'Faculty',
      password,
    });

    try {
      const Faculty = require('../models/Faculty');
      await Faculty.create({
        facultyId: user._id,
        name: name.trim(),
        email: email.trim(),
        passwordHash: password,
        department: departmentId,
        clgName: clgName.trim(),
        contactNumber: phone.trim(),
        type: usertype,
        role: 'faculty'
      });
    } catch (err) {
      console.error('Note: Faculty record creation failed:', err.message);
    }

    try {
      await sendEmail(
        email,
        'Faculty Registration - GAT Portal',
        '',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Welcome to GAT Portal</h2>
          <p>Dear ${name},</p>
          <p>Your faculty account has been created successfully.</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p><strong>⚠️ Important:</strong> Please change your password after your first login.</p>
          <p>Best regards,<br>GAT Portal Team</p>
        </div>`
      );
      console.log('📧 Welcome email sent to:', email);
    } catch (err) {
      console.error('Email error:', err.message);
    }

    console.log('✅ Faculty registered successfully:', email);

    res.json({ 
      success: true,
      message: 'Faculty registered successfully',
      credentials: { username: email, password }
    });
  } catch (err) {
    console.error('❌ Error registering faculty:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to register faculty' 
    });
  }
};

/**
 * Logout - log user activity
 * POST /logout
 */
exports.logout = async (req, res) => {
  try {
    // Log logout activity
    await logLogout(req);
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (err) {
    console.error('❌ Error during logout:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during logout' 
    });
  }
};