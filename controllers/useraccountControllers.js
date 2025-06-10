const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const roleMap = {
  1: 'superadmin',
  2: 'admin',
  3: 'employee',
};

exports.getuseraccount = async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM user_account');
    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ message: 'Database query failed', error: err });
  }
};

// New: Login controller
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });

  try {
    const [rows] = await pool.query('SELECT * FROM user_account WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });
    if (user.is_active !== 1) return res.status(403).json({ message: 'Account inactive' });

    // ✅ เปลี่ยนจากเช็ค plain text เป็น bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid username or password' });

    const payload = {
      id: user.id,
      username: user.username,
      role: roleMap[user.role_id] || 'employee',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.json({ token, role: payload.role });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
