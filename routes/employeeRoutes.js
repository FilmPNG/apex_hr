// routes/employeeRoutes.js
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const employeeController = require('../controllers/employeesController');
const { addEmployee, upload } = require('../controllers/employeesController');





const uploadFields = upload.fields([
  { name: 'jobApplication', maxCount: 10 },
  { name: 'certificate', maxCount: 10 },
  { name: 'nationalId', maxCount: 1 },
  { name: 'householdRegistration', maxCount: 1 },
  { name: 'bankBook', maxCount: 1 },
  { name: 'employmentContract', maxCount: 1 },
])


router.post('/addemployee', uploadFields, addEmployee);


//router.post('/add', uploadFields, employeeController.addEmployee)

// 🔽 API: ดึงพนักงานทั้งหมด
router.get('/', employeeController.getAllEmployees);


router.get("/:id", employeeController.getEmployeeById);

// router.delete('/employee/:id', employeeController.deleteEmployee);

module.exports = router
