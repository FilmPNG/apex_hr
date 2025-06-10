const pool = require('../config/db');
const moment = require('moment');

exports.addEmployee = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const data = req.body;
    const files = req.files;
    await conn.beginTransaction();

    // 0️⃣ ดึง employee_type_id จากชื่อ (data.type)
    const [typeResult] = await conn.query(
      'SELECT employee_type_id FROM master_employee_type WHERE name = ?',
      [data.type]
    );

    if (typeResult.length === 0) {
      throw new Error(`ไม่พบประเภทพนักงาน "${data.type}"`);
    }

    const employeeTypeId = typeResult[0].employee_type_id;

    // 1️⃣ เพิ่มที่อยู่ก่อน เพื่อใช้ address_id
    const [addressCardResult] = await conn.query(`
      INSERT INTO address_card (address, sub_district, district, province, postal_code)
      VALUES (?, ?, ?, ?, ?)`,
      [data.idCardAddress, data.idCardSubdistrict, data.idCardDistrict, data.idCardProvince, data.idCardZipCode]);
    const addressCardId = addressCardResult.insertId;

    console.log('ที่อยู่ add');
    const [addressHouseResult] = await conn.query(`
      INSERT INTO address_house (address, sub_district, district, province, postal_code)
      VALUES (?, ?, ?, ?, ?)`,
      [data.currentAddress, data.currentSubdistrict, data.currentDistrict, data.currentProvince, data.currentZipCode]);
    const addressHouseId = addressHouseResult.insertId;

    // 2️⃣ เพิ่มผู้ติดต่อฉุกเฉิน
    const [contact1Result] = await conn.query(`
      INSERT INTO contact_person1 (name, relationship, mobile, address)
      VALUES (?, ?, ?, ?)`,
      [data.emergencyContactName, data.emergencyContactRelation, data.emergencyContactPhone, data.emergencyContactAddress]);
    const contactPerson1Id = contact1Result.insertId;
    console.log('ติดต่อ add');
    const [contact2Result] = await conn.query(`
      INSERT INTO contact_person2 (name, relationship, mobile, address)
      VALUES (?, ?, ?, ?)`,
      [data.emergencyContactName2, data.emergencyContactRelation2, data.emergencyContactPhone2, data.emergencyContactAddress2]);
    const contactPerson2Id = contact2Result.insertId;

    // 3️⃣ เพิ่ม employee พร้อม reference id ต่างๆ
    const [employeeResult] = await conn.query(`
      INSERT INTO employee (
        first_name, last_name, nickname, email_person, mobile_no,
        birth_date, gender, marital_status, position, employee_type_id,
        start_date, bank_name, account_number, account_name,
        father_name, father_occupation, mother_name, mother_occupation,
        spouse_name, spouse_occupation, language_speaking, language_reading,
        language_writing, criminal_record, upcountry_areas,
        address_card_id, address_house_id, contact_person1_id, contact_person2_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.firstName, data.lastName, data.nickname, data.email,
        data.phone, data.dob, data.gender, data.maritalStatus, data.position,
        employeeTypeId, data.startDate, data.bankName, data.accountNumber,
        data.accountHolderName, data.fatherName, data.fatherOccupation,
        data.motherName, data.motherOccupation, data.spouseName,
        data.spouseOccupation, data.speaking, data.reading, data.writing,
        data.hasCriminalRecord, data.canRelocate,
        addressCardId, addressHouseId, contactPerson1Id, contactPerson2Id
      ]);
    const employeeId = employeeResult.insertId;
    console.log('employee add');

    // 4️⃣ แนบไฟล์
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const fileMappings = [
      { key: 'jobApplication', type: 'jobApplication' },
      { key: 'certificate', type: 'certificate' },
      { key: 'nationalId', type: 'nationalId' },
      { key: 'householdRegistration', type: 'householdRegistration' },
      { key: 'bankBook', type: 'bankBook' },
      { key: 'employmentContract', type: 'employmentContract' }
    ];
    console.log('ไฟล์ add');
    for (const fileMap of fileMappings) {
      const f = files[fileMap.key];
      if (!f) continue;

      const fileArray = Array.isArray(f) ? f : [f];
      for (const file of fileArray) {
        await conn.query(`
          INSERT INTO attachment (reference_id, reference_type, file_name, file_type, file_path, create_date, create_name)
          VALUES (?, 'employee', ?, ?, ?, ?, ?)`,
          [employeeId, file.originalname, file.mimetype, file.path, now, 'system']);
      }
    }

    await conn.commit();
    conn.release();

    res.status(200).json({
      message: '✅ เพิ่มพนักงานเรียบร้อยแล้ว',
      employeeId
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('❌ Error saving employee:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
};
