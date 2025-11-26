// backend/src/controllers/mbafacultyController.js
const crypto = require('crypto');
const User = require('../models/User');
const MBAFaculty = require('../models/MBAFaculty');
const MBADepartment = require('../models/mbaDepartment');
const Verification = require('../models/Verification');
const sendEmail = require('../utils/mailer');
const xlsx = require('xlsx');
const { logLogin } = require('../middleware/activityLogger');
const jwt = require('jsonwebtoken');

// Generate 6-character alphanumeric password
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * MBA Faculty Login - send verification code
 * POST /api/mbafaculty/login
 */
exports.loginMBAFaculty = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // First check user collection for authentication
    const user = await User.findOne({ username, password }).lean();
    if (!user || user.role !== 'MBAFaculty') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials or not an MBA faculty member' 
      });
    }

    // Get MBA faculty details
    const faculty = await MBAFaculty.findOne({ facultyId: user._id }).lean();
    if (!faculty || !faculty.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'MBA Faculty account not found or inactive' 
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Store verification code on faculty document with expiration
    await MBAFaculty.findOneAndUpdate(
      { facultyId: user._id },
      { 
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt
      },
      { new: true }
    );

    // Also store in Verification collection for consistency (like regular faculty login)
    await Verification.findOneAndUpdate(
      { email: username },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendEmail(
        username,
        'MBA Faculty Login - Verification Code',
        '',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">MBA Faculty Login Verification</h2>
          <p>Hello ${faculty.name},</p>
          <p>Your verification code for MBA faculty login:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h1 style="color: #4CAF50; margin: 0; font-size: 36px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p><strong>This code is valid for 10 minutes.</strong></p>
          <p>If you didn't attempt to login, please ignore this email.</p>
          <p>Best regards,<br>GAT Portal Team</p>
        </div>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
    res.json({ 
      success: true, 
      message: emailConfigured ? 'Verification code sent to email' : 'Email not configured; code returned in response',
      code: emailConfigured ? undefined : code
    });
  } catch (err) {
    console.error('Error during MBA faculty login:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Verify MBA faculty login code
 * POST /api/mbafaculty/verify
 */
exports.verifyMBAFaculty = async (req, res) => {
  const { email, code } = req.body;
  
  try {
    // Find user first
    const user = await User.findOne({ username: email }).lean();
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user' 
      });
    }

    // Check verification code in Verification collection first (like regular faculty)
    const verificationRecord = await Verification.findOne({ 
      email: email.trim(), 
      code: code.trim() 
    }).lean();

    if (!verificationRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }

    // Check if code has expired
    if (verificationRecord.expiresAt < new Date()) {
      await Verification.deleteOne({ email: email.trim() });
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code has expired. Please login again.' 
      });
    }

    // Find MBA faculty record
    const faculty = await MBAFaculty.findOne({ facultyId: user._id }).lean();
    if (!faculty) {
      return res.status(400).json({ 
        success: false, 
        message: 'MBA Faculty profile not found' 
      });
    }

    // Clear code from both collections after successful verification
    await Verification.deleteOne({ email: email.trim() });
    await MBAFaculty.updateOne({ facultyId: user._id }, { 
      $unset: { verificationCode: 1, verificationCodeExpiresAt: 1 } 
    });

    // 🔥 GENERATE JWT TOKEN
    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email || faculty.email,
        role: user.role,
        usertype: user.usertype || faculty.type,
        name: user.name || faculty.name,
        department: faculty.department || user.deptName,
        college: faculty.clgName || user.clgName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 🔥 LOG LOGIN ACTIVITY
    await logLogin({
      id: user._id.toString(),
      username: user.username,
      name: user.name || faculty.name,
      role: user.role,
      usertype: user.usertype || faculty.type
    }, req);

    // Return faculty data with TOKEN
    res.json({ 
      success: true, 
      message: 'Verification successful',
      token: token,
      facultyData: {
        id: faculty._id,
        name: faculty.name || user.name,
        email: faculty.email || user.email,
        department: faculty.department || user.deptName,
        clgName: faculty.clgName || user.clgName,
        contactNumber: faculty.contactNumber || user.phoneNo,
        type: faculty.type || user.usertype
      }
    });
  } catch (err) {
    console.error('Error during MBA faculty verification:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

/**
 * Forgot MBA faculty password
 * POST /api/mbafaculty/forgot-password
 */
exports.forgotMBAFacultyPassword = async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await User.findOne({ username: email, role: 'MBAFaculty' }).lean();
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'MBA Faculty account not found' 
      });
    }

    const faculty = await MBAFaculty.findOne({ facultyId: user._id }).lean();
    if (!faculty) {
      return res.status(401).json({ 
        success: false, 
        message: 'MBA Faculty profile not found' 
      });
    }

    try {
      await sendEmail(
        email,
        'GAT Portal - MBA Faculty Password Recovery',
        '',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Recovery</h2>
          <p>Hello ${faculty.name},</p>
          <p>Your temporary password is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #FF5722; margin: 0; font-size: 24px; letter-spacing: 2px;">${user.password}</h2>
          </div>
          <p><strong>⚠️ Important:</strong> Please login and change your password immediately for security reasons.</p>
          <p>If you have any questions, contact the examination cell at <a href="mailto:support@gat.ac.in">support@gat.ac.in</a>.</p>
          <p>Best regards,<br>
          Examination Cell<br>
          Global Academy of Technology</p>
        </div>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }
    
    res.json({ 
      success: true, 
      message: 'Password sent to your email' 
    });
  } catch (err) {
    console.error('Error during MBA faculty forgot-password:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

/**
 * Register new MBA faculty
 * POST /api/mbafaculty/register
 */
exports.registerMBAFaculty = async (req, res) => {
  try {
    const { name, clgName, deptName, email, phone, usertype, departmentId } = req.body;
    
    const username = email;
    const password = generatePassword();

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Create user record
    const user = await User.create({
      name,
      username,
      clgName,
      deptName: deptName || departmentId,
      email,
      phoneNo: phone,
      password,
      usertype: usertype || 'internal',
      role: 'MBAFaculty',
    });

    // Create MBA faculty record
    const faculty = await MBAFaculty.create({
      facultyId: user._id,
      name,
      email,
      passwordHash: password,
      department: deptName || departmentId,
      clgName,
      contactNumber: phone,
      type: usertype,
      role: 'mba-faculty'
    });

    try {
      await sendEmail(
        email,
        'Welcome to GAT Portal - MBA Faculty Registration',
        '',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Welcome to GAT Portal</h2>
          <p>Dear ${name},</p>
          <p>Your MBA faculty account has been created successfully.</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p><strong>⚠️ Important:</strong> Please change your password after your first login.</p>
          <p>Best regards,<br>GAT Portal Team</p>
        </div>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.status(201).json({ 
      message: 'MBA Faculty registration successful', 
      credentials: { username, password },
      facultyId: faculty._id,
      success: true
    });
  } catch (error) {
    console.error('MBA Faculty registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get MBA faculty profile
 * GET /api/mbafaculty/profile/:email
 */
exports.getMBAFacultyProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ username: email }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const faculty = await MBAFaculty.findOne({ facultyId: user._id }).lean();
    if (!faculty) {
      return res.status(404).json({ error: 'MBA Faculty profile not found' });
    }

    res.json({
      id: faculty._id,
      name: faculty.name,
      email: faculty.email,
      department: faculty.department,
      clgName: faculty.clgName,
      contactNumber: faculty.contactNumber,
      role: faculty.role,
      createdAt: faculty.createdAt
    });
  } catch (err) {
    console.error('Error fetching MBA faculty profile:', err);
    res.status(500).json({ error: 'Failed to fetch MBA faculty profile' });
  }
};

/**
 * Update MBA faculty profile
 * PUT /api/mbafaculty/profile/:email
 */
exports.updateMBAFacultyProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;

    const user = await User.findOne({ username: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const faculty = await MBAFaculty.findOneAndUpdate(
      { facultyId: user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!faculty) {
      return res.status(404).json({ error: 'MBA Faculty profile not found' });
    }

    res.json({ message: 'MBA Faculty profile updated successfully', faculty });
  } catch (err) {
    console.error('Error updating MBA faculty profile:', err);
    res.status(500).json({ error: 'Failed to update MBA faculty profile' });
  }
};

/**
 * Reset MBA faculty password
 * POST /api/mbafaculty/reset-password
 */
exports.resetMBAFacultyPassword = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  
  try {
    // Verify in users collection
    const user = await User.findOne({ username, password: oldPassword });
    if (!user || user.role !== 'MBAFaculty') {
      return res.status(401).json({ 
        error: 'Old password is incorrect or not an MBA faculty member' 
      });
    }

    // Update password in both collections
    user.password = newPassword;
    await user.save();

    await MBAFaculty.findOneAndUpdate(
      { facultyId: user._id },
      { passwordHash: newPassword }
    );

    res.status(200).json({ 
      success: true,
      message: 'Password updated successfully' 
    });
  } catch (err) {
    console.error('MBA Faculty password update error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

/**
 * Get all MBA faculties
 * GET /api/mbafaculty/all
 */
exports.getAllMBAFaculties = async (req, res) => {
  try {
    const faculties = await MBAFaculty.find({ isActive: true })
      .select('-passwordHash -verificationCode')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(faculties);
  } catch (err) {
    console.error('Error fetching MBA faculties:', err);
    res.status(500).json({ error: 'Failed to fetch MBA faculties' });
  }
};

/**
 * Get MBA faculties by department
 * GET /api/mbafaculty/department/:department
 */
exports.getMBAFacultiesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const faculties = await MBAFaculty.find({ department, isActive: true })
      .select('-passwordHash -verificationCode')
      .sort({ name: 1 })
      .lean();
    
    res.json(faculties);
  } catch (err) {
    console.error('Error fetching MBA faculties by department:', err);
    res.status(500).json({ error: 'Failed to fetch MBA faculties' });
  }
};

/**
 * MBA Faculty Logout - log activity
 * POST /api/mbafaculty/logout
 */
exports.logoutMBAFaculty = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const username = req.user?.username;
    const role = req.user?.role;
    const name = req.user?.name;
    const usertype = req.user?.usertype;

    console.log(`MBA Faculty logout: ${username} (${userId}) - Role: ${role}`);
    
    // Update MBA Faculty collection with last logout time
    if (userId) {
      await MBAFaculty.findOneAndUpdate(
        { facultyId: userId },
        { lastLogout: new Date() }
      );
    }

    // 🔥 LOG THE LOGOUT ACTIVITY (this will emit to Socket.io)
    const { logLogout } = require('../middleware/activityLogger');
    await logLogout(req);

    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('MBA Faculty logout error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Logout failed' 
    });
  }
};

/**
 * Bulk upload MBA faculties via Excel
 * POST /api/mbafaculty/bulk-upload
 */
exports.bulkUploadMBAFaculties = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty or invalid' });
    }

    const validDepartments = await MBADepartment.find({ isActive: true }).select('name').lean();
    const validDeptNames = validDepartments.map(dept => dept.name);

    const results = { created: 0, skipped: 0, errors: [] };

    for (const [index, row] of rows.entries()) {
      const name = String(row.name || row.Name || '').trim();
      const email = String(row.email || row.Email || '').trim();
      const phone = String(row.phone || row.Phone || row.contactNumber || '').trim();
      const clgName = String(row.clgName || row.College || row.college || '').trim();
      const deptName = String(row.deptName || row.Department || row.department || '').trim();
      const usertype = String(row.usertype || row.type || '').trim() || 'internal';

      if (!name || !email || !deptName) {
        results.errors.push({ 
          row: index + 2, 
          error: 'Missing required fields (name, email, deptName)' 
        });
        continue;
      }

      if (!validDeptNames.includes(deptName)) {
        results.errors.push({ 
          row: index + 2, 
          error: `Invalid department "${deptName}". Valid: ${validDeptNames.join(', ')}` 
        });
        continue;
      }

      try {
        const existingUser = await User.findOne({ $or: [{ username: email }, { email }] });
        if (existingUser) {
          results.skipped++;
          continue;
        }

        const username = email;
        const password = generatePassword();

        const user = await User.create({
          name,
          username,
          clgName,
          deptName,
          email,
          phoneNo: phone,
          password,
          usertype,
          role: 'MBAFaculty'
        });

        await MBAFaculty.create({
          facultyId: user._id,
          name,
          email,
          passwordHash: password,
          department: deptName,
          clgName,
          contactNumber: phone,
          type: usertype,
          role: 'mba-faculty'
        });

        try {
          await sendEmail(
            email,
            'Welcome to GAT Portal - MBA Faculty Registration',
            '',
            `<p>Dear ${name},</p><p>Your account has been created.</p><p><strong>Username:</strong> ${username}<br/><strong>Password:</strong> ${password}</p>`
          );
        } catch (e) {
          // Ignore email errors in bulk
        }

        results.created++;
      } catch (e) {
        results.errors.push({ row: index + 2, error: e.message });
      }
    }

    return res.json({
      message: 'Bulk upload processed',
      ...results
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  }
};

