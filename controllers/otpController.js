const pool = require('../config/db');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    // เช็คว่า email มีอยู่ในระบบหรือไม่ (เช่นในตาราง users)
    const [userRows] = await pool.execute('SELECT * FROM user_account WHERE username = ?', [email]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Email not found in the system' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 นาที

    // บันทึก OTP ลงฐานข้อมูล
    await pool.execute(
      'INSERT INTO otp_codes (email, otp_code, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );

    // ส่งอีเมล
    await transporter.sendMail({
      from: `"HR Apex Capable Tech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'OTP For ResetPassword HR Apex Capable Tech',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://scontent.fbkk8-4.fna.fbcdn.net/v/t39.30808-6/375952200_7052790364744919_7906568038356719851_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHtGbDC8IjyShRkvD8Z2836gocd7-J2FJ2Chx3v4nYUnTXll2HARho4iRlt9YS0XWNqpmDiTImZh7z0RkhFCml2&_nc_ohc=i4ilTmVb9usQ7kNvwEAXIA6&_nc_oc=Admi0KKvbkkV7A7bG0buYukZyQkHdO3V8rdw42LxlpOJcgoVJLQEQ1Z-9du2aRMU4nECDbjd8Xc250cTxqiUdMzc&_nc_zt=23&_nc_ht=scontent.fbkk8-4.fna&_nc_gid=q8IG3XMULGEH0qQFvE1HWg&oh=00_AfNLwKZM2lEfYjmVqM3liXPsIPMMrBS5ojKcFpam7YDNjg&oe=68485271" alt="HR Apex Capable Tech Logo" style="max-height: 60px;" />
          </div>
          <h2 style="color: #2E86C1;">HR Apex Capable Tech</h2>
          <p>Dear user,</p>
          <p>Your <strong>OTP code</strong> to reset your password is:</p>
          <p style="font-size: 24px; font-weight: bold; color: #E74C3C; background-color: #FDEDEC; padding: 10px 20px; border-radius: 5px; display: inline-block;">${otp}</p>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <hr style="border:none; border-top: 1px solid #ccc; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    res.json({ message: 'OTP sent successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};


exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM otp_codes WHERE email = ? AND otp_code = ? ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const record = rows[0];
    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    await pool.execute('DELETE FROM otp_codes WHERE id = ?', [record.id]);

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};





// ทุกวันตอนเที่ยงคืน (00:00) ลบ OTP ที่หมดอายุ
cron.schedule('0 0 * * *', async () => {
  try {
    await pool.execute('DELETE FROM otp_codes WHERE expires_at < NOW()');
    console.log('Expired OTPs cleaned up at midnight');
  } catch (err) {
    console.error('Error cleaning expired OTPs:', err);
  }
});
