const MBAAssignment = require('../models/MBAAssignment');
const User = require('../models/User');
const sendEmail = require('../utils/mailer');

exports.assignQPSetter = async (req, res) => {
  const { users, subjectCode, submitDate } = req.body;
  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'No users provided' });
  }
  if (!subjectCode) {
    return res.status(400).json({ error: 'Subject code missing' });
  }
  if (!submitDate) {
    return res.status(400).json({ error: 'Submission date missing' });
  }

  try {
    const results = await Promise.allSettled(
      users.map(async ({ email, password }) => {
        if (!email) {
          throw new Error('Email is required');
        }
        
        // Check if assignment already exists
        const exists = await MBAAssignment.findOne({ email, subject_code: subjectCode });
        if (exists) {
          console.log(`Assignment already exists for ${email} and ${subjectCode}`);
          return { email, status: 'exists' };
        }
        
        // Create assignment
        await MBAAssignment.create({ 
          email, 
          subject_code: subjectCode, 
          submit_date: new Date(submitDate) 
        });
        
        // Send email (don't fail if email fails)
        try {
          await sendEmail(
            email,
            'Appointment as MBA Question Paper Setter - GAT Exam Portal',
            '',
            `<p>Dear Faculty,</p>
            
            <p>We are pleased to inform you that you have been assigned as a Question Paper Setter for the MBA course <span style="font-size: 20px; font-weight: bold; color: #2c5aa0; background-color: #f0f8ff; padding: 4px 8px; border-radius: 4px;">${subjectCode}</span>.</p>
            
            <p><span style="background-color: #fff3cd; color: #856404; padding: 8px 12px; border-radius: 4px; font-weight: bold; border-left: 4px solid #ffc107;"><b>Submission Deadline:</b> ${submitDate}</span></p>
            
            <p>Your login credentials are as follows:</p>
            
            <p><b>Username:</b> ${email}<br>
            <b>Password:</b> ${password || ''}</p>
            
            <p>Please use the above credentials to log in to the Question Paper Setting System. For security reasons, we strongly recommend that you change your password immediately after logging in.</p>
            
            <p>If you have any questions or face difficulties accessing the system, kindly contact the examination cell at support@gat.ac.in.</p>
            
            <p>Best regards,<br>
            Examination Cell<br>
            Global Academy of Technology</p>`
          );
        } catch (emailErr) {
          console.error(`Email error for ${email}:`, emailErr.message);
          // Don't fail the assignment if email fails
        }
        
        return { email, status: 'created' };
      })
    );
    
    // Check if any assignments were created
    const created = results.filter(r => r.status === 'fulfilled' && r.value?.status === 'created');
    const existing = results.filter(r => r.status === 'fulfilled' && r.value?.status === 'exists');
    const failed = results.filter(r => r.status === 'rejected');
    
    if (failed.length > 0) {
      console.error('Some assignments failed:', failed);
    }
    
    if (created.length === 0 && existing.length === 0) {
      return res.status(400).json({ 
        error: 'No assignments were created. All may already exist or failed.',
        details: failed.map(f => f.reason?.message || 'Unknown error')
      });
    }
    
    res.status(200).json({ 
      message: 'MBA QP setters assigned successfully',
      created: created.length,
      existing: existing.length,
      failed: failed.length
    });
  } catch (err) {
    console.error('Error assigning MBA QP setters:', err);
    res.status(500).json({ 
      error: 'Failed to assign MBA QP setters',
      details: err.message 
    });
  }
};

exports.assignedSubjects = async (_req, res) => {
  try {
    // First check if there are any assignments at all
    const assignmentCount = await MBAAssignment.countDocuments();
    if (assignmentCount === 0) {
      return res.json([]);
    }

    const rows = await MBAAssignment.aggregate([
      { $lookup: { from: 'users', localField: 'email', foreignField: 'email', as: 'user' } },
      { $lookup: { from: 'mbafaculties', localField: 'email', foreignField: 'email', as: 'mbaFaculty' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$mbaFaculty', preserveNullAndEmptyArrays: true } },
      { $match: { 
        $or: [
          { 'user.role': 'MBAFaculty' },
          { 'mbaFaculty': { $exists: true, $ne: null } },
          { 'user': { $exists: false }, 'mbaFaculty': { $exists: true } }
        ]
      } },
      { $sort: { subject_code: 1, submit_date: -1 } },
    ]);

    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    const grouped = {};
    rows.forEach((row) => {
      if (!row.subject_code) return; // Skip if no subject code
      
      if (!grouped[row.subject_code]) {
        grouped[row.subject_code] = {
          subject_code: row.subject_code,
          submit_date: row.submit_date,
          assigned_at: row.assigned_at,
          assignees: [],
        };
      }
      // Use user data if available, otherwise use mbaFaculty data
      const name = row.user?.name || row.mbaFaculty?.name || 'Unknown';
      const clgName = row.user?.clgName || row.mbaFaculty?.clgName || '';
      const deptName = row.user?.deptName || row.mbaFaculty?.department || '';
      
      grouped[row.subject_code].assignees.push({
        id: row._id,
        name: name,
        clgName: clgName,
        deptName: deptName,
        email: row.email,
      });
    });
    
    const result = Object.values(grouped);
    res.json(result);
  } catch (err) {
    console.error('Error fetching MBA assigned subjects:', err);
    res.status(500).json({ error: 'Failed to fetch MBA assigned subjects', details: err.message });
  }
};

exports.assignmentsBySubject = async (req, res) => {
  const { subjectCode } = req.params;
  try {
    const rows = await MBAAssignment.aggregate([
      { $match: { subject_code: subjectCode } },
      { $lookup: { from: 'users', localField: 'email', foreignField: 'email', as: 'user' } },
      { $lookup: { from: 'mbafaculties', localField: 'email', foreignField: 'email', as: 'mbaFaculty' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$mbaFaculty', preserveNullAndEmptyArrays: true } },
      { $match: { 
        $or: [
          { 'user.role': 'MBAFaculty' },
          { 'mbaFaculty': { $exists: true, $ne: null } }
        ]
      } },
      { $sort: { submit_date: -1 } },
      { $project: {
        id: '$_id',
        email: 1,
        subjectCode: '$subject_code',
        submitDate: '$submit_date',
        assignedAt: '$assigned_at',
        facultyName: { $ifNull: ['$user.name', '$mbaFaculty.name'] },
        clgName: { $ifNull: ['$user.clgName', '$mbaFaculty.clgName'] },
        deptName: { $ifNull: ['$user.deptName', '$mbaFaculty.department'] },
      } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching MBA assignments:', err);
    res.status(500).json({ error: 'Failed to fetch MBA assignments' });
  }
};

// Get assignments by MBA faculty email for dashboard
exports.getFacultyAssignments = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const assignments = await MBAAssignment.aggregate([
      { $match: { email: email } },
      { $lookup: { from: 'mbasubjects', localField: 'subject_code', foreignField: 'subject_code', as: 'subject' } },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      { $sort: { assigned_at: -1 } },
      { $project: {
        _id: 1,
        subject_code: 1,
        subject_name: '$subject.subject_name',
        assigned_at: 1,
        submit_date: 1,
        status: {
          $cond: {
            if: { $eq: ['$status', 'submitted'] },
            then: 'Submitted',
            else: {
              $cond: {
                if: { $lt: ['$submit_date', new Date()] },
                then: 'Overdue',
                else: 'Pending'
              }
            }
          }
        }
      } }
    ]);

    res.json({
      faculty_email: email,
      assignments: assignments,
      total_assignments: assignments.length,
      pending: assignments.filter(a => a.status === 'Pending').length,
      overdue: assignments.filter(a => a.status === 'Overdue').length,
      submitted: assignments.filter(a => a.status === 'Submitted').length
    });
  } catch (err) {
    console.error('Error fetching MBA faculty assignments:', err);
    res.status(500).json({ error: 'Failed to fetch MBA faculty assignments' });
  }
};

// Get assigned MBA subject codes for a faculty member
exports.getFacultySubjectCodes = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const assignments = await MBAAssignment.aggregate([
      { $match: { email: email } },
      { $lookup: { from: 'mbasubjects', localField: 'subject_code', foreignField: 'subject_code', as: 'subject' } },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      { $project: {
        subject_code: 1,
        subject_name: '$subject.subject_name',
        submit_date: 1,
        status: 1
      } }
    ]);

    res.json(assignments);
  } catch (err) {
    console.error('Error fetching MBA faculty subject codes:', err);
    res.status(500).json({ error: 'Failed to fetch MBA faculty subject codes' });
  }
};

// Update MBA assignment status to submitted
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { email, subjectCode } = req.body;
    
    if (!email || !subjectCode) {
      return res.status(400).json({ error: 'Email and subject code are required' });
    }

    const assignment = await MBAAssignment.findOneAndUpdate(
      { email: email, subject_code: subjectCode },
      { 
        status: 'submitted',
        submitted_at: new Date()
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ error: 'MBA Assignment not found' });
    }

    res.json({ message: 'MBA Assignment status updated successfully', assignment });
  } catch (err) {
    console.error('Error updating MBA assignment status:', err);
    res.status(500).json({ error: 'Failed to update MBA assignment status' });
  }
};

// Get recent MBA assignments for notifications
exports.getRecentAssignments = async (req, res) => {
  try {
    const assignments = await MBAAssignment.aggregate([
      { $lookup: { from: 'users', localField: 'email', foreignField: 'email', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'mbafaculties', localField: 'email', foreignField: 'email', as: 'mbaFaculty' } },
      { $unwind: { path: '$mbaFaculty', preserveNullAndEmptyArrays: true } },
      { $match: { 
        $or: [
          { 'user.role': 'MBAFaculty' },
          { 'mbaFaculty': { $exists: true, $ne: null } }
        ]
      } },
      { $sort: { assigned_at: -1 } },
      { $limit: 50 },
      { $project: {
        _id: 1,
        subjectCode: '$subject_code',
        submitDate: '$submit_date',
        assignedDate: { $dateToString: { format: '%Y-%m-%d', date: '$assigned_at' } },
        completedAt: { $cond: { if: { $eq: ['$status', 'submitted'] }, then: { $dateToString: { format: '%Y-%m-%d', date: '$submitted_at' } }, else: null } },
        status: {
          $cond: {
            if: { $eq: ['$status', 'submitted'] },
            then: 'Completed',
            else: 'Pending'
          }
        },
        facultyNames: { 
          $cond: { 
            if: { $ne: ['$user.name', null] }, 
            then: ['$user.name'], 
            else: ['$mbaFaculty.name'] 
          } 
        },
        department: { 
          $cond: { 
            if: { $ne: ['$user.deptName', null] }, 
            then: '$user.deptName', 
            else: '$mbaFaculty.department' 
          } 
        },
        deadline: { $dateToString: { format: '%Y-%m-%d', date: '$submit_date' } }
      } }
    ]);

    res.json(assignments);
  } catch (err) {
    console.error('Error fetching recent MBA assignments:', err);
    res.status(500).json({ error: 'Failed to fetch recent MBA assignments' });
  }
};

