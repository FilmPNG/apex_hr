const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // อัปโหลดไปโฟลเดอร์นี้
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.array('files'), (req, res) => {
  const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
  res.status(200).json({ fileUrls });
});

module.exports = router;
