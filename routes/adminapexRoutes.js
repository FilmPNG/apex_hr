const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/admin-only', authenticateToken, isAdmin, (req, res) => {
  res.json({ message: 'Admin content' });
});

module.exports = router;
