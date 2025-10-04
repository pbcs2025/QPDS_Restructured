const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text, html) {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('📧 Email credentials not configured. Email would have been sent to:', to);
    console.log('📧 Subject:', subject);
    console.log('📧 Content:', html || text);
    console.log('');
    console.log('⚠️  To enable email functionality, create a .env file in the backend directory with:');
    console.log('EMAIL_USER=your-gmail@gmail.com');
    console.log('EMAIL_PASSWORD=your-app-password');
    console.log('');
    return { messageId: 'mock-email-id' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `Admin GAT COE <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
  return info;
}

module.exports = sendEmail;







