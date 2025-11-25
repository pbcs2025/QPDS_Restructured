// Seed script for MBA Departments and Subjects
require('dotenv').config();
const mongoose = require('mongoose');
const MBADepartment = require('../src/models/mbaDepartment');
const MBASubject = require('../src/models/mbaSubject');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qpds';

// MBA Departments to seed
const MBA_DEPARTMENTS = [
  { name: "Finance Management", color: "#1e40af" },
  { name: "Human Resource Management", color: "#7c3aed" },
  { name: "Marketing Management", color: "#dc2626" },
  { name: "Operations & Logistics Management", color: "#059669" },
  { name: "Business Analytics / IT Management", color: "#ea580c" }
];

// MBA Subjects to seed
const MBA_SUBJECTS = [
  // Semester 1 - Common for all departments
  {
    subject_code: "MBA101",
    subject_name: "Management & Organizational Behaviour",
    department: "Finance Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA102",
    subject_name: "Managerial Economics",
    department: "Finance Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA103",
    subject_name: "Accounting for Managers",
    department: "Finance Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA104",
    subject_name: "Marketing Management",
    department: "Finance Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA105",
    subject_name: "Business Statistics & Research Methods",
    department: "Finance Management",
    semester: 1,
    credits: 3
  },
  // Repeat for Human Resource Management
  {
    subject_code: "MBA101-HR",
    subject_name: "Management & Organizational Behaviour",
    department: "Human Resource Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA102-HR",
    subject_name: "Managerial Economics",
    department: "Human Resource Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA103-HR",
    subject_name: "Accounting for Managers",
    department: "Human Resource Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA104-HR",
    subject_name: "Marketing Management",
    department: "Human Resource Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA105-HR",
    subject_name: "Business Statistics & Research Methods",
    department: "Human Resource Management",
    semester: 1,
    credits: 3
  },
  // Repeat for Marketing Management
  {
    subject_code: "MBA101-MKT",
    subject_name: "Management & Organizational Behaviour",
    department: "Marketing Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA102-MKT",
    subject_name: "Managerial Economics",
    department: "Marketing Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA103-MKT",
    subject_name: "Accounting for Managers",
    department: "Marketing Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA104-MKT",
    subject_name: "Marketing Management",
    department: "Marketing Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA105-MKT",
    subject_name: "Business Statistics & Research Methods",
    department: "Marketing Management",
    semester: 1,
    credits: 3
  },
  // Repeat for Operations & Logistics Management
  {
    subject_code: "MBA101-OP",
    subject_name: "Management & Organizational Behaviour",
    department: "Operations & Logistics Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA102-OP",
    subject_name: "Managerial Economics",
    department: "Operations & Logistics Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA103-OP",
    subject_name: "Accounting for Managers",
    department: "Operations & Logistics Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA104-OP",
    subject_name: "Marketing Management",
    department: "Operations & Logistics Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA105-OP",
    subject_name: "Business Statistics & Research Methods",
    department: "Operations & Logistics Management",
    semester: 1,
    credits: 3
  },
  // Repeat for Business Analytics / IT Management
  {
    subject_code: "MBA101-BA",
    subject_name: "Management & Organizational Behaviour",
    department: "Business Analytics / IT Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA102-BA",
    subject_name: "Managerial Economics",
    department: "Business Analytics / IT Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA103-BA",
    subject_name: "Accounting for Managers",
    department: "Business Analytics / IT Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA104-BA",
    subject_name: "Marketing Management",
    department: "Business Analytics / IT Management",
    semester: 1,
    credits: 3
  },
  {
    subject_code: "MBA105-BA",
    subject_name: "Business Statistics & Research Methods",
    department: "Business Analytics / IT Management",
    semester: 1,
    credits: 3
  },
  // Semester 2 - Finance Management specific
  {
    subject_code: "MBA201",
    subject_name: "Financial Management",
    department: "Finance Management",
    semester: 2,
    credits: 3
  },
  {
    subject_code: "MBA202",
    subject_name: "Security Analysis & Portfolio Management",
    department: "Finance Management",
    semester: 2,
    credits: 3
  },
  {
    subject_code: "MBA203",
    subject_name: "International Financial Management",
    department: "Finance Management",
    semester: 2,
    credits: 3
  },
  {
    subject_code: "MBA204",
    subject_name: "Cost & Management Accounting",
    department: "Finance Management",
    semester: 2,
    credits: 3
  },
  {
    subject_code: "MBA205",
    subject_name: "Banking & Insurance",
    department: "Finance Management",
    semester: 2,
    credits: 3
  }
];

async function seedMBAData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Seed Departments
    console.log('\n📚 Seeding MBA Departments...');
    for (const dept of MBA_DEPARTMENTS) {
      try {
        const existing = await MBADepartment.findOne({ name: dept.name });
        if (!existing) {
          await MBADepartment.create(dept);
          console.log(`  ✅ Created department: ${dept.name}`);
        } else {
          console.log(`  ⏭️  Department already exists: ${dept.name}`);
        }
      } catch (err) {
        console.error(`  ❌ Error creating department ${dept.name}:`, err.message);
      }
    }

    // Seed Subjects
    console.log('\n📖 Seeding MBA Subjects...');
    for (const subject of MBA_SUBJECTS) {
      try {
        const existing = await MBASubject.findOne({ subject_code: subject.subject_code });
        if (!existing) {
          await MBASubject.create(subject);
          console.log(`  ✅ Created subject: ${subject.subject_code} - ${subject.subject_name}`);
        } else {
          console.log(`  ⏭️  Subject already exists: ${subject.subject_code}`);
        }
      } catch (err) {
        console.error(`  ❌ Error creating subject ${subject.subject_code}:`, err.message);
      }
    }

    console.log('\n✅ MBA data seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding MBA data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedMBAData();

