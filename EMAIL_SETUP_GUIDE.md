# Email Configuration Setup Guide

## 🚨 Issue Fixed: "Missing credentials for PLAIN"

The email functionality has been updated to gracefully handle missing credentials. Here's how to set it up:

## ✅ Current Behavior (Without Email Setup)
- ✅ Registration and login work perfectly
- ✅ Verification codes are displayed in server console
- ✅ No email errors or crashes
- ✅ System provides clear setup instructions

## 📧 To Enable Email Functionality

### Step 1: Create `.env` file
Create a file named `.env` in the `backend` directory with the following content:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://prathibhabcs:globalacademyoftechnology@clusterqpds.6ybfzvb.mongodb.net/GAT_QPDS

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Step 2: Gmail App Password Setup
1. **Go to Google Account Settings**: https://myaccount.google.com/
2. **Enable 2-Factor Authentication** (if not already enabled)
3. **Generate App Password**:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (custom name)"
   - Name it "QPDS Faculty System"
   - Copy the 16-character password

### Step 3: Update .env file
```env
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

## 🔧 Alternative Email Providers

### Using Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Using Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

## 🧪 Testing Email Functionality

After setting up the `.env` file:

1. **Restart the backend server**
2. **Test faculty registration** from AdminManageFaculty
3. **Test faculty login** - verification code should be sent via email

## 🎯 Current System Status

### ✅ Working Features (Without Email Setup):
- Faculty registration through AdminManageFaculty
- Faculty login with email as username
- Password generation (6-character alphanumeric)
- Verification codes (displayed in console)
- Faculty dashboard with personalized info
- Faculty type classification (internal/external)

### ✅ Working Features (With Email Setup):
- All above features PLUS
- Email notifications for registration credentials
- Email verification codes for login
- Password recovery emails

## 🚀 Quick Start (No Email Required)

1. **Start Backend**: `cd backend && npm start`
2. **Start Frontend**: `cd frontend_end && npm start`
3. **Register Faculty**: Use AdminManageFaculty form
4. **Check Console**: Credentials will be displayed in backend console
5. **Login**: Use email as username with generated password

## 📋 Email Content Examples

### Registration Email
```
Subject: Welcome to GAT Portal - Faculty Registration

Hi [Faculty Name],

Your registration as faculty is successful!

Login credentials:
Username: faculty@gat.edu
Password: Xk7pM2

Please change your password after logging in.
```

### Login Verification Email
```
Subject: Faculty Login - Verification Code

Hello [Faculty Name],

Your verification code for faculty login:
123456

Valid for 10 minutes.
```

---

**Note**: The system works perfectly without email configuration. Email setup is optional for enhanced user experience.

