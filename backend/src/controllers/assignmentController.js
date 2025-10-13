const Assignment = require('../models/Assignment');
const User = require('../models/User');
const sendEmail = require('../utils/mailer');

exports.assignQPSetter = async (req, res) => {
  const { users, subjectCode, submitDate } = req.body;
  if (!users || !Array.isArray(users) || users.length === 0) return res.status(400).json({ error: 'No users provided' });
  if (!subjectCode) return res.status(400).json({ error: 'Subject code missing' });
  if (!submitDate) return res.status(400).json({ error: 'Submission date missing' });

  try {
    const ops = users.map(async ({ email, password }) => {
      const exists = await Assignment.findOne({ email, subject_code: subjectCode });
      if (exists) return null;
      await Assignment.create({ email, subject_code: subjectCode, submit_date: new Date(submitDate) });
      try {
        await sendEmail(
          email,
          'Appointment as Question Paper Setter - GAT Exam Portal',
          '',
          `<p>Assigned for <b>${subjectCode}</b>. Submission Deadline: ${submitDate}</p>
           <p>Credentials:</p><ul><li>Username: ${email}</li><li>Password: ${password || ''}</li></ul>`
        );
      } catch (err) {
        console.error('Email error:', err.message);
      }
    });
    await Promise.all(ops);
    res.status(200).json({ message: 'QP setters assigned successfully' });
  } catch (err) {
    console.error('Error assigning QP setters:', err);
    res.status(500).json({ error: 'Failed to assign QP setters' });
  }
};

exports.assignedSubjects = async (_req, res) => {
  try {
    const rows = await Assignment.aggregate([
      { $lookup: { from: 'users', localField: 'email', foreignField: 'email', as: 'user' } },
      { $unwind: '$user' },
      { $sort: { subject_code: 1, submit_date: -1 } },
    ]);

    const grouped = {};
    rows.forEach((row) => {
      if (!grouped[row.subject_code]) {
        grouped[row.subject_code] = {
          subject_code: row.subject_code,
          submit_date: row.submit_date,
          assigned_at: row.assigned_at,
          assignees: [],
        };
      }
      grouped[row.subject_code].assignees.push({
        id: row._id,
        name: row.user.name,
        clgName: row.user.clgName,
        deptName: row.user.deptName,
        email: row.email,
      });
    });
    res.json(Object.values(grouped));
  } catch (err) {
    console.error('Error fetching assigned subjects:', err);
    res.status(500).json({ error: 'Failed to fetch assigned subjects' });
  }
};

exports.assignmentsBySubject = async (req, res) => {
  const { subjectCode } = req.params;
  try {
    const rows = await Assignment.aggregate([
      { $match: { subject_code: subjectCode } },
      { $lookup: { from: 'users', localField: 'email', foreignField: 'email', as: 'user' } },
      { $unwind: '$user' },
      { $sort: { submit_date: -1 } },
      { $project: {
        id: '$_id',
        email: 1,
        subjectCode: '$subject_code',
        submitDate: '$submit_date',
        assignedAt: '$assigned_at',
        facultyName: '$user.name',
        clgName: '$user.clgName',
        deptName: '$user.deptName',
      } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

// Get assignments by faculty email for dashboard
exports.getFacultyAssignments = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const assignments = await Assignment.aggregate([
      { $match: { email: email } },
      { $lookup: { from: 'subjects', localField: 'subject_code', foreignField: 'subject_code', as: 'subject' } },
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
    console.error('Error fetching faculty assignments:', err);
    res.status(500).json({ error: 'Failed to fetch faculty assignments' });
  }
};

// Get assigned subject codes for a faculty member
exports.getFacultySubjectCodes = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const assignments = await Assignment.aggregate([
      { $match: { email: email } },
      { $lookup: { from: 'subjects', localField: 'subject_code', foreignField: 'subject_code', as: 'subject' } },
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
    console.error('Error fetching faculty subject codes:', err);
    res.status(500).json({ error: 'Failed to fetch faculty subject codes' });
  }
};

// Update assignment status to submitted
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { email, subjectCode } = req.body;
    
    if (!email || !subjectCode) {
      return res.status(400).json({ error: 'Email and subject code are required' });
    }

    const assignment = await Assignment.findOneAndUpdate(
      { email: email, subject_code: subjectCode },
      { 
        status: 'submitted',
        submitted_at: new Date()
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Assignment status updated successfully', assignment });
  } catch (err) {
    console.error('Error updating assignment status:', err);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
};







