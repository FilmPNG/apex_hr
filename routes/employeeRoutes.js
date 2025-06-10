// routes/employeeRoutes.js
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const employeeController = require('../controllers/employeesController');


// 📦 สร้าง storage สำหรับ multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({ storage })

const uploadFields = upload.fields([
  { name: 'jobApplication', maxCount: 10 },
  { name: 'certificate', maxCount: 10 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'householdRegistration', maxCount: 1 },
  { name: 'bankBook', maxCount: 1 },
  { name: 'employmentContract', maxCount: 1 },
])

router.post('/add', uploadFields, employeeController.addEmployee)

module.exports = router
