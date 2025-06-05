const express = require('express');
const router = express.Router();
const { getuseraccount, login } = require('../controllers/useraccountControllers');

router.get('/getuseraccount', getuseraccount);
router.post('/login', login);  // เพิ่ม route สำหรับ login

module.exports = router;
