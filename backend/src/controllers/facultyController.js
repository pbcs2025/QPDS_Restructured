const crypto = require('crypto');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Verification = require('../models/Verification');
const sendEmail = require('../utils/mailer');

// Generate 6-character alphanumeric password
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

exports.registerFaculty = async (req, res) => {
  try {
    const { name, clgName, deptName, email, phone, usertype, departmentId } = req.body;
    
    // Use email as username
    const username = email;
    const password = generatePassword(); // 6-character alphanumeric

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user record for authentication
    const user = await User.create({
      name,
      username,
      clgName,
      deptName: deptName || departmentId,
      email,
      phoneNo: phone,
      password, // Not encrypted as requested
      usertype: usertype || 'internal',
      role: 'Faculty',
    });

    // Create faculty record with detailed information
    const faculty = await Faculty.create({
      facultyId: user._id,
      name,
      email,
      passwordHash: password, // Not encrypted as requested
      department: deptName || departmentId,
      clgName,
      contactNumber: phone,
      type: usertype, // internal or external
      role: 'faculty'
    });

    try {
      await sendEmail(
        email,
        'Welcome to GAT Portal - Faculty Registration',
        '',
        `<p>Hi ${name},<br><br>Your registration as faculty is successful!<br><br>Login credentials:<br>Username: ${username}<br>Password: ${password}<br><br>Please change your password after logging in.</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.status(201).json({ 
      message: 'Faculty registration successful', 
      credentials: { username, password },
      facultyId: faculty._id,
      success: true
    });
  } catch (error) {
    console.error('Faculty registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.loginFaculty = async (req, res) => {
  const { username, password } = req.body;
  try {
    // First check user collection for authentication
    const user = await User.findOne({ username, password }).lean();
    if (!user || user.role !== 'Faculty') {
      return res.status(401).json({ success: false, message: 'Invalid credentials or not a faculty member' });
    }

    // Get faculty details
    const faculty = await Faculty.findOne({ facultyId: user._id }).lean();
    if (!faculty || !faculty.isActive) {
      return res.status(401).json({ success: false, message: 'Faculty account not found or inactive' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Verification.findOneAndUpdate(
      { email: username },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendEmail(
        username,
        'Faculty Login - Verification Code',
        '',
        `<p>Hello ${faculty.name},<br><br>Your verification code for faculty login:</p><h2>${code}</h2><p>Valid for 10 minutes.</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.json({ success: true, message: 'Verification code sent to email' });
  } catch (err) {
    console.error('Error during faculty login:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyFaculty = async (req, res) => {
  const { email, code } = req.body;
  try {
    const rec = await Verification.findOne({ email, code }).lean();
    if (!rec || rec.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    
    // Get faculty details for response
    const user = await User.findOne({ username: email }).lean();
    const faculty = await Faculty.findOne({ facultyId: user._id }).lean();
    
    await Verification.deleteOne({ email });
    res.json({ 
      success: true, 
      message: 'Verification successful',
      facultyData: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        clgName: faculty.clgName
      }
    });
  } catch (err) {
    console.error('Error during faculty verification:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFacultyProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ username: email }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const faculty = await Faculty.findOne({ facultyId: user._id }).lean();
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty profile not found' });
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
    console.error('Error fetching faculty profile:', err);
    res.status(500).json({ error: 'Failed to fetch faculty profile' });
  }
};

exports.updateFacultyProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;

    const user = await User.findOne({ username: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const faculty = await Faculty.findOneAndUpdate(
      { facultyId: user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty profile not found' });
    }

    res.json({ message: 'Faculty profile updated successfully', faculty });
  } catch (err) {
    console.error('Error updating faculty profile:', err);
    res.status(500).json({ error: 'Failed to update faculty profile' });
  }
};

exports.resetFacultyPassword = async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  try {
    // Verify in users collection
    const user = await User.findOne({ username, password: oldPassword });
    if (!user || user.role !== 'Faculty') {
      return res.status(401).json({ error: 'Old password is incorrect or not a faculty member' });
    }

    // Update password in both collections
    user.password = newPassword;
    await user.save();

    await Faculty.findOneAndUpdate(
      { facultyId: user._id },
      { passwordHash: newPassword }
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Faculty password update error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.forgotFacultyPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ username: email, role: 'Faculty' }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Faculty account not found' });
    }

    const faculty = await Faculty.findOne({ facultyId: user._id }).lean();
    if (!faculty) {
      return res.status(401).json({ success: false, message: 'Faculty profile not found' });
    }

    try {
      await sendEmail(
        email,
        'GAT Portal - Faculty Password Recovery',
        '',
        `<p>Hello ${faculty.name},<br><br>Your temporary password is:</p><h2>${user.password}</h2><p>Please login and change your password immediately.</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }
    
    res.json({ success: true, message: 'Password sent to your email' });
  } catch (err) {
    console.error('Error during faculty forgot-password:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.find({ isActive: true })
      .select('-passwordHash -verificationCode')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(faculties);
  } catch (err) {
    console.error('Error fetching faculties:', err);
    res.status(500).json({ error: 'Failed to fetch faculties' });
  }
};

exports.getFacultiesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const faculties = await Faculty.find({ department, isActive: true })
      .select('-passwordHash -verificationCode')
      .sort({ name: 1 })
      .lean();
    
    res.json(faculties);
  } catch (err) {
    console.error('Error fetching faculties by department:', err);
    res.status(500).json({ error: 'Failed to fetch faculties' });
  }
};
