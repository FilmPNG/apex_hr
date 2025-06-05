const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../config/db");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // ค้นหา user
    const [rows] = await db.promise().query(
      "SELECT * FROM useraccount WHERE username = ? AND is_active = 1",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // ตรวจรหัสผ่าน (ถ้ารหัสผ่านถูกเข้ารหัสไว้ ใช้ bcrypt.compare)
    const passwordMatch = password === user.password; // หรือใช้ bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // สร้าง JWT payload
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role_id === 1 ? "admin" : "user",
    };

    // สร้าง token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
