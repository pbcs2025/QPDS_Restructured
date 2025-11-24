const crypto = require('crypto');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const sendEmail = require('../utils/mailer');
const xlsx = require('xlsx');

// Generate 6-character alphanumeric password
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

exports.checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await User.findOne({ $or: [{ username: email }, { email }] });
    const exists = !!existingUser;
    
    res.json({ exists });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.registerFaculty = async (req, res) => {
  try {
    const { name, clgName, deptName, email, phone, usertype, departmentId } = req.body;
    
    // Use email as username
    const username = email;
    const password = generatePassword(); // 6-character alphanumeric

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
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
        `<p>Dear ${name},</p>
        
        <p>Welcome to Global Academy of Technology - QPDS Portal! We are pleased to inform you that your faculty registration has been successfully completed.</p>
        
        <p>Your account has been created and activated. You can now access the Question Paper Development System (QPDS) using the credentials provided below:</p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #2c5aa0; margin-top: 0;">Login Credentials</h3>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Password:</strong> <span style="font-size: 18px; font-weight: bold; color: #333; background-color: #e9ecef; padding: 4px 8px; border-radius: 4px;">${password}</span></p>
        </div>
        
        <p><strong>Important Security Notice:</strong> For security reasons, we strongly recommend that you change your password immediately after your first login.</p>
        
        <p>You can access the system by visiting the faculty login portal and using the credentials provided above.</p>
        
        <p>If you encounter any issues or have questions regarding the system, please do not hesitate to contact our technical support team at support@gat.ac.in.</p>
        
        <p>We look forward to your contribution to our academic community.</p>
        
        <p>Best regards,<br>
        <strong>Examination Cell</strong><br>
        Global Academy of Technology<br>
        Bengaluru, Karnataka</p>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        <p style="font-size: 12px; color: #6c757d; text-align: center;">
          This is an automated message. Please do not reply to this email.<br>
          For support, contact: support@gat.ac.in
        </p>`
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
    if (!user || (user.role !== 'Faculty' && user.role !== 'Verifier')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or not authorized' });
    }

    // Get faculty details
    const faculty = await Faculty.findOne({ facultyId: user._id }).lean();
    if (!faculty || !faculty.isActive) {
      return res.status(401).json({ success: false, message: 'Faculty account not found or inactive' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store verification code on faculty document until used
    await Faculty.findOneAndUpdate(
      { facultyId: user._id },
      { verificationCode: code },
      { new: true }
    );

    // Check if faculty is a temporary verifier
    const isTemporaryVerifier = faculty.verifierExpiresAt && faculty.verifierExpiresAt > new Date();

    let emailInfo = null;
    try {
      emailInfo = await sendEmail(
        username,
        'Faculty Login - Verification Code',
        '',
        `<p>Hello ${faculty.name},</p>

        <p>Your verification code for faculty login:</p>

        <h2 style="font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">${code}</h2>

        <p>Valid for 10 minutes.</p>`
      );
    } catch (err) {
      console.error('Email error:', err.message);
    }

    // If email is not configured, also return the code in response for testing
    const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
    res.json({
      success: true,
      message: emailConfigured ? 'Verification code sent to email' : 'Email not configured; code returned in response',
      code: emailConfigured ? undefined : code,
      isTemporaryVerifier,
      verifierExpiresAt: faculty.verifierExpiresAt
    });
  } catch (err) {
    console.error('Error during faculty login:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyFaculty = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ username: email }).lean();
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid user' });
    }
    const faculty = await Faculty.findOne({ facultyId: user._id }).lean();
    if (!faculty || faculty.verificationCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Check if faculty is a temporary verifier
    const isTemporaryVerifier = faculty.verifierExpiresAt && faculty.verifierExpiresAt > new Date();

    // Clear code after successful verification
    await Faculty.updateOne({ facultyId: user._id }, { $unset: { verificationCode: 1 } });
    res.json({
      success: true,
      message: 'Verification successful',
      facultyData: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
        clgName: faculty.clgName,
        isTemporaryVerifier,
        verifierExpiresAt: faculty.verifierExpiresAt,
        assignedSubjects: faculty.assignedSubjects || []
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

// Get fresh faculty data for dashboard refresh (includes temporary verifier info)
exports.getFreshFacultyData = async (req, res) => {
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

    // Check if faculty is a temporary verifier
    const isTemporaryVerifier = faculty.verifierExpiresAt && faculty.verifierExpiresAt > new Date();

    res.json({
      id: faculty._id,
      name: faculty.name,
      email: faculty.email,
      department: faculty.department,
      clgName: faculty.clgName,
      isTemporaryVerifier,
      verifierExpiresAt: faculty.verifierExpiresAt,
      assignedSubjects: faculty.assignedSubjects || []
    });
  } catch (err) {
    console.error('Error fetching fresh faculty data:', err);
    res.status(500).json({ error: 'Failed to fetch fresh faculty data' });
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
        `<p>Hello ${faculty.name},</p>
        
        <p>Your temporary password is:</p>
        
        <h2 style="font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">${user.password}</h2>
        
        <p>Please login and change your password immediately.</p>
        
        <p>If you have any questions or face difficulties accessing the system, kindly contact the examination cell at support@gat.ac.in.</p>
        
        <p>Best regards,<br>
        Examination Cell<br>
        Global Academy of Technology</p>`
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

// Bulk upload faculties via Excel/CSV (buffer from multer)
exports.bulkUploadFaculties = async (req, res) => {
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

    // Get valid departments from database
    const validDepartments = await Department.find({ isActive: true }).select('name').lean();
    const validDeptNames = validDepartments.map(dept => dept.name);

    // Expected headers: name, email, phone, clgName, deptName, usertype
    const results = { created: 0, skipped: 0, errors: [] };

    for (const [index, row] of rows.entries()) {
      const name = String(row.name || row.Name || '').trim();
      const email = String(row.email || row.Email || '').trim();
      const phone = String(row.phone || row.Phone || row.contactNumber || '').trim();
      const clgName = String(row.clgName || row.College || row.college || '').trim();
      const deptName = String(row.deptName || row.Department || row.department || '').trim();
      const usertype = String(row.usertype || row.type || '').trim() || 'internal';

      if (!name || !email || !deptName) {
        results.errors.push({ row: index + 2, error: 'Missing required fields (name, email, deptName)' });
        continue;
      }

      // Validate department name against database
      if (!validDeptNames.includes(deptName)) {
        results.errors.push({ 
          row: index + 2, 
          error: `Invalid department "${deptName}". Valid departments: ${validDeptNames.join(', ')}` 
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
          role: 'Faculty'
        });

        await Faculty.create({
          facultyId: user._id,
          name,
          email,
          passwordHash: password,
          department: deptName,
          clgName,
          contactNumber: phone,
          type: usertype,
          role: 'faculty'
        });

        // Email is best-effort; don't fail the whole row if it errors
        try {
          await sendEmail(
            email,
            'Welcome to GAT Portal - Faculty Registration',
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

exports.sendMessageToFaculty = async (req, res) => {
  try {
    const { email, messageType, subjectCode, submitDate, facultyName } = req.body;

    if (!email || !messageType) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and message type are required' 
      });
    }

    if (!['reminder', 'earlySubmission'].includes(messageType)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid message type. Must be "reminder" or "earlySubmission"' 
      });
    }

    // Get faculty details
    const faculty = await Faculty.findOne({ email }).lean();
    if (!faculty) {
      return res.status(404).json({ 
        success: false,
        error: 'Faculty not found' 
      });
    }

    const name = facultyName || faculty.name;
    let subject, html;

    if (messageType === 'reminder') {
      // Deadline reminder message
      const deadlineText = submitDate 
        ? new Date(submitDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'the specified deadline';
      
      subject = `Reminder: Question Paper Submission Deadline - ${subjectCode || 'Assignment'}`;
      html = `
        <p>Dear ${name},</p>
        
        <p>This is a reminder regarding your question paper submission assignment.</p>
        
        ${subjectCode ? `<p><strong>Subject Code:</strong> ${subjectCode}</p>` : ''}
        ${submitDate ? `<p><strong>Submission Deadline:</strong> ${deadlineText}</p>` : ''}
        
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">⚠️ Deadline Reminder</h3>
          <p style="color: #856404; margin: 0;">Please ensure that you submit your question paper by <strong>${deadlineText}</strong>. Timely submission is crucial for the smooth conduct of examinations.</p>
        </div>
        
        <p>If you have any questions or face any difficulties in preparing the question paper, please do not hesitate to contact the examination cell at support@gat.ac.in.</p>
        
        <p>We appreciate your cooperation and look forward to receiving your submission.</p>
        
        <p>Best regards,<br>
        <strong>Examination Cell</strong><br>
        Global Academy of Technology<br>
        Bengaluru, Karnataka</p>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        <p style="font-size: 12px; color: #6c757d; text-align: center;">
          This is an automated message. Please do not reply to this email.<br>
          For support, contact: support@gat.ac.in
        </p>
      `;
    } else if (messageType === 'earlySubmission') {
      // Early submission request message
      subject = `Request for Early Submission - ${subjectCode || 'Question Paper Assignment'}`;
      html = `
        <p>Dear ${name},</p>
        
        <p>We hope this message finds you well.</p>
        
        ${subjectCode ? `<p><strong>Subject Code:</strong> ${subjectCode}</p>` : ''}
        ${submitDate ? `<p><strong>Original Submission Deadline:</strong> ${new Date(submitDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>` : ''}
        
        <div style="background-color: #d1ecf1; border: 1px solid #0c5460; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0c5460; margin-top: 0;">📝 Early Submission Request</h3>
          <p style="color: #0c5460; margin: 0;">We kindly request you to submit your question paper as early as possible, if your schedule permits. Early submissions help us in better planning and preparation for the examination process.</p>
        </div>
        
        <p><strong>Benefits of Early Submission:</strong></p>
        <ul>
          <li>Allows time for thorough review and verification</li>
          <li>Ensures adequate time for any necessary corrections</li>
          <li>Facilitates better coordination with other examination processes</li>
          <li>Helps maintain a smooth workflow</li>
        </ul>
        
        <p>Please note that this is a request, and we understand if you need the full allocated time. However, if you are able to complete and submit earlier, it would be greatly appreciated.</p>
        
        <p>If you have any questions or concerns, please feel free to contact the examination cell at support@gat.ac.in.</p>
        
        <p>Thank you for your understanding and cooperation.</p>
        
        <p>Best regards,<br>
        <strong>Examination Cell</strong><br>
        Global Academy of Technology<br>
        Bengaluru, Karnataka</p>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        <p style="font-size: 12px; color: #6c757d; text-align: center;">
          This is an automated message. Please do not reply to this email.<br>
          For support, contact: support@gat.ac.in
        </p>
      `;
    }

    try {
      await sendEmail(email, subject, '', html);
      res.json({ 
        success: true, 
        message: `Message sent successfully to ${name}` 
      });
    } catch (err) {
      console.error('Email error:', err.message);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send email. Please check email configuration.' 
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};
