const multer = require('multer');
const path = require('path');
const fs = require("fs");
const pool = require('../config/db'); // your MySQL pool connection
const uploadsDir = path.join(__dirname, "../uploads");







// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage to save files with unique names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using timestamp and random string, retaining the original file extension
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname); // Get the file's extension
    const filename = `${uniqueSuffix}${fileExtension}`;
    cb(null, filename); // Set the unique filename
  },
});

// File filter to allow only specific file types (JPEG, PNG, PDF)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."), false);
  }
};

// Multer setup for handling file uploads
exports.upload = multer({ storage, fileFilter });

exports.addEmployee = async (req, res) => {
  const {
    first_name,
    last_name,
    nickname,
    mobile_no,
    birth_date,
    gender,
    nationality,
    religion,
    marital_status,
    email_person,
    line_id,
    id_card_number,
    id_card_issued_date,
    id_card_expiry_date,
    position,
    salary,
    start_date,
    probation_end_date,
    status_employee = 'ACTIVE',
    bank_name,
    account_number,
    account_name,
    father_name,
    father_birthdate,
    father_occupation,
    mother_name,
    mother_birthdate,
    mother_occupation,
    spouse_name,
    spouse_birthdate,
    spouse_occupation,
    total_siblings,
    order_of_siblings,
    total_children,
    total_boys,
    total_girls,
    language_speaking,
    language_reading,
    language_writing,
    criminal_record,
    upcountry_areas,
    create_name = null,
    modify_name = null,
    // Address card fields
    address_house_address,
    address_house_sub_district,
    address_house_district,
    address_house_province,
    address_house_postal_code,
    // Address house fields (ใหม่)
    address_card_address,
    address_card_sub_district,
    address_card_district,
    address_card_province,
    address_card_postal_code,
    employee_type_id,
    // Contact person 1
    contact_person1_name,
    contact_person1_relationship,
    contact_person1_mobile,
    contact_person1_address,
    // Contact person 2
    contact_person2_name,
    contact_person2_relationship,
    contact_person2_mobile,
    contact_person2_address,
    // Children data - array of objects with child_name and child_birthdate
    children_data = [],
    // Siblings data - array of objects with siblings info
    siblings_data = [],
    // Education history data - array of objects with education info
    education_history_data = [],
    // Work experience data - array of objects with work experience info
    work_experience_data = []
  } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let finalAttachmentId = null;

    // Step 1: Insert address_card
    const [insertAddressCard] = await connection.query(
      `INSERT INTO address_card (address, sub_district, district, province, postal_code)
       VALUES (?, ?, ?, ?, ?)`,
      [address_card_address, address_card_sub_district, address_card_district, address_card_province, address_card_postal_code]
    );
    const address_card_id = insertAddressCard.insertId;

    // Step 2: Insert address_house (ใหม่)
    const [insertAddressHouse] = await connection.query(
      `INSERT INTO address_house (address, sub_district, district, province, postal_code)
       VALUES (?, ?, ?, ?, ?)`,
      [address_house_address, address_house_sub_district, address_house_district, address_house_province, address_house_postal_code]
    );
    const address_house_id = insertAddressHouse.insertId;

    // Step 3: Insert main attachment
    const [insertAttachment] = await connection.query(
      `INSERT INTO attachment (reference_type, create_name, modify_name, create_date, modify_date)
       VALUES (?, ?, ?, NOW(), NOW())`,
      ['employee', create_name, modify_name]
    );
    finalAttachmentId = insertAttachment.insertId;

    const uploadedFiles = [];
    const allAttachmentIds = [finalAttachmentId];

    // Step 4: Handle uploaded files
    if (req.files && req.files['file_name'] && req.files['file_name'].length > 0) {
      for (let i = 0; i < req.files['file_name'].length; i++) {
        const file = req.files['file_name'][i];
        const fileName = file.filename;
        const filePath = `/uploads/${fileName}`;

        if (i === 0) {
          await connection.query(
            `UPDATE attachment SET file_name = ?, file_path = ?, modify_date = NOW() WHERE attachment_id = ?`,
            [fileName, filePath, finalAttachmentId]
          );

          uploadedFiles.push({
            attachment_id: finalAttachmentId,
            file_name: fileName,
            file_path: filePath
          });
        } else {
          const [newAttachment] = await connection.query(
            `INSERT INTO attachment (file_name, file_path, reference_type, create_name, modify_name, create_date, modify_date)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [fileName, filePath, 'employee', create_name, modify_name]
          );
          allAttachmentIds.push(newAttachment.insertId);
          uploadedFiles.push({
            attachment_id: newAttachment.insertId,
            file_name: fileName,
            file_path: filePath
          });
        }
      }
    }

    // Step 5: Insert employee and link with address_card_id, address_house_id, attachment_id, and employee_type_id
    const [employeeInsert] = await connection.query(
      `INSERT INTO employee (
        first_name, last_name, nickname, pic_path, mobile_no, birth_date, gender,
        nationality, religion, marital_status, email_person, line_id,
        id_card_number, id_card_issued_date, id_card_expiry_date,
        position, salary, start_date, probation_end_date, status_employee,
        bank_name, account_number, account_name,
        father_name, father_birthdate, father_occupation,
        mother_name, mother_birthdate, mother_occupation,
        spouse_name, spouse_birthdate, spouse_occupation,
        total_siblings, order_of_siblings, total_children, total_boys, total_girls,
        language_speaking, language_reading, language_writing,
        criminal_record, upcountry_areas, attachment_id, address_card_id, address_house_id, employee_type_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        first_name, last_name, nickname,
        uploadedFiles[0]?.file_path || null,
        mobile_no, birth_date, gender,
        nationality, religion, marital_status, email_person, line_id,
        id_card_number, id_card_issued_date, id_card_expiry_date,
        position, salary, start_date, probation_end_date, status_employee,
        bank_name, account_number, account_name,
        father_name, father_birthdate, father_occupation,
        mother_name, mother_birthdate, mother_occupation,
        spouse_name, spouse_birthdate, spouse_occupation,
        total_siblings, order_of_siblings, total_children, total_boys, total_girls,
        language_speaking, language_reading, language_writing,
        criminal_record, upcountry_areas, finalAttachmentId, address_card_id, address_house_id, employee_type_id
      ]
    );

    const insertedEmployeeId = employeeInsert.insertId;

    // Step 6.1: Insert contact_person1
    const [insertContactPerson1] = await connection.query(
      `INSERT INTO contact_person1 (name, relationship, mobile, address)
       VALUES (?, ?, ?, ?)`,
      [contact_person1_name, contact_person1_relationship, contact_person1_mobile, contact_person1_address]
    );
    const [insertContactPerson2] = await connection.query(
      `INSERT INTO contact_person2 (name, relationship, mobile, address)
       VALUES (?, ?, ?, ?)`,
      [contact_person2_name, contact_person2_relationship, contact_person2_mobile, contact_person2_address]
    );
    const contact_person1_id = insertContactPerson1.insertId;
    const contact_person2_id = insertContactPerson2.insertId;

    // Step 6.2: Update employee with contact_person1_id and contact_person2_id
    await connection.query(
      `UPDATE employee SET contact_person1_id = ?, contact_person2_id = ? WHERE employee_id = ?`,
      [contact_person1_id, contact_person2_id, insertedEmployeeId]
    );

    // Step 6.3: Insert children data
    const insertedChildrenIds = [];
    if (children_data && Array.isArray(children_data) && children_data.length > 0) {
      for (const child of children_data) {
        const { child_name, child_birthdate } = child;
        if (child_name && child_birthdate) {
          const [insertChild] = await connection.query(
            `INSERT INTO children (child_name, child_birthdate, employee_id)
             VALUES (?, ?, ?)`,
            [child_name, child_birthdate, insertedEmployeeId]
          );
          insertedChildrenIds.push({
            child_id: insertChild.insertId,
            child_name: child_name,
            child_birthdate: child_birthdate
          });
        }
      }
    }

    // Step 6.4: Insert siblings data
    const insertedSiblingsIds = [];
    if (siblings_data && Array.isArray(siblings_data) && siblings_data.length > 0) {
      for (const sibling of siblings_data) {
        const { siblings_name, siblings_birthdate, siblings_mobile, siblings_occupation } = sibling;
        if (siblings_name) {
          const [insertSibling] = await connection.query(
            `INSERT INTO siblings (siblings_name, siblings_birthdate, siblings_mobile, siblings_occupation, employee_id)
             VALUES (?, ?, ?, ?, ?)`,
            [siblings_name, siblings_birthdate, siblings_mobile, siblings_occupation, insertedEmployeeId]
          );
          insertedSiblingsIds.push({
            siblings_id: insertSibling.insertId,
            siblings_name: siblings_name,
            siblings_birthdate: siblings_birthdate,
            siblings_mobile: siblings_mobile,
            siblings_occupation: siblings_occupation
          });
        }
      }
    }

    // Step 6.5: Insert education history data
    const insertedEducationIds = [];
    if (education_history_data && Array.isArray(education_history_data) && education_history_data.length > 0) {
      for (const education of education_history_data) {
        const { level, field, institution, year } = education;
        if (level) {
          const [insertEducation] = await connection.query(
            `INSERT INTO education_history (level, field, institution, year, employee_id)
             VALUES (?, ?, ?, ?, ?)`,
            [level, field, institution, year, insertedEmployeeId]
          );
          insertedEducationIds.push({
            education_id: insertEducation.insertId,
            level: level,
            field: field,
            institution: institution,
            year: year
          });
        }
      }
    }

    // Step 6.6: Insert work experience data
    const insertedWorkExperienceIds = [];
    if (work_experience_data && Array.isArray(work_experience_data) && work_experience_data.length > 0) {
      for (const workExp of work_experience_data) {
        const { company, position, from_date, to_date, salary, detail } = workExp;
        if (company) {
          const [insertWorkExp] = await connection.query(
            `INSERT INTO work_experience (company, position, from_date, to_date, salary, detail, employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [company, position, from_date, to_date, salary, detail, insertedEmployeeId]
          );
          insertedWorkExperienceIds.push({
            work_experience_id: insertWorkExp.insertId,
            company: company,
            position: position,
            from_date: from_date,
            to_date: to_date,
            salary: salary,
            detail: detail
          });
        }
      }
    }

    // Step 7: Update reference_id in attachments
    for (const attachmentId of allAttachmentIds) {
      await connection.query(
        `UPDATE attachment SET reference_id = ? WHERE attachment_id = ?`,
        [insertedEmployeeId, attachmentId]
      );
    }

    // Step 8: Update employee_type name using employee name
    const [employeeTypeRows] = await connection.query(
      `SELECT name FROM employee_type WHERE employee_type_id = ?`,
      [employee_type_id]
    );

    if (employeeTypeRows.length > 0) {
      await connection.query(
        `UPDATE employee_type SET name = ? WHERE employee_type_id = ?`,
        [`${first_name} ${last_name}`, employee_type_id]
      );
    }

    await connection.commit();

    res.status(200).json({
      message: 'เพิ่มข้อมูลพนักงานสำเร็จ',
      insertedId: insertedEmployeeId,
      address_card_id: address_card_id,
      address_house_id: address_house_id,
      contact_person1_id: contact_person1_id,
      contact_person2_id: contact_person2_id,
      children_ids: insertedChildrenIds,
      siblings_ids: insertedSiblingsIds,
      education_ids: insertedEducationIds,
      work_experience_ids: insertedWorkExperienceIds,
      main_attachment_id: finalAttachmentId,
      all_attachment_ids: allAttachmentIds,
      uploaded_files: uploadedFiles
    });

  } catch (err) {
    await connection.rollback();
    console.error('Database error:', err);
    res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลพนักงาน',
      detail: err.message
    });
  } finally {
    connection.release();
  }
};

exports.getAllEmployees = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    const search = req.query.search || "";
    const status = req.query.status || "";
    const type = req.query.type || "";
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const allowedSortBy = [
      "e.employee_id", "e.first_name", "e.last_name", "e.nickname", "e.email_person",
      "e.status_employee", "e.employee_type_id", "e.start_date"
    ];
    const sort_by = allowedSortBy.includes(req.query.sort_by) ? req.query.sort_by : "e.employee_id";
    const order = req.query.order === "desc" ? "DESC" : "ASC";
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    let params = [];

    if (search) {
      const keyword = `%${search}%`;
      whereClause += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.nickname LIKE ? OR e.email_person LIKE ?)`;
      params.push(keyword, keyword, keyword, keyword);
    }

    if (status) {
      whereClause += " AND e.status_employee = ?";
      params.push(status);
    }

    if (type) {
      whereClause += " AND e.employee_type_id = ?";
      params.push(type);
    }

    const query = `
      SELECT 
        e.*,

        ah.address AS house_address,
        ah.sub_district AS house_sub_district,
        ah.district AS house_district,
        ah.province AS house_province,
        ah.postal_code AS house_postal_code,

        ac.address AS card_address,
        ac.sub_district AS card_sub_district,
        ac.district AS card_district,
        ac.province AS card_province,
        ac.postal_code AS card_postal_code,

        cp1.name AS cp1_name,
        cp1.relationship AS cp1_relationship,
        cp1.mobile AS cp1_mobile,
        cp1.address AS cp1_address,

        cp2.name AS cp2_name,
        cp2.relationship AS cp2_relationship,
        cp2.mobile AS cp2_mobile,
        cp2.address AS cp2_address

      FROM employee e
      LEFT JOIN address_house ah ON e.address_house_id = ah.address_house_id
      LEFT JOIN address_card ac ON e.address_card_id = ac.address_card_id
      LEFT JOIN contact_person1 cp1 ON e.contact_person1_id = cp1.contact_person1_id
      LEFT JOIN contact_person2 cp2 ON e.contact_person2_id = cp2.contact_person2_id
      ${whereClause}
      ORDER BY ${sort_by} ${order}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const [rows] = await conn.query(query, queryParams);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM employee e
      ${whereClause}
    `;
    const [countResult] = await conn.query(countQuery, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const data = rows.map(e => ({
      employee_id: e.employee_id,
      first_name: e.first_name,
      last_name: e.last_name,
      nickname: e.nickname,
      pic_path: e.pic_path,
      email_person: e.email_person,
      mobile_no: e.mobile_no,
      birth_date: e.birth_date,
      gender: e.gender,
      nationality: e.nationality,
      religion: e.religion,
      marital_status: e.marital_status,
      line_id: e.line_id,
      id_card_number: e.id_card_number,
      id_card_issued_date: e.id_card_issued_date,
      id_card_expiry_date: e.id_card_expiry_date,
      position: e.position,
      salary: e.salary,
      start_date: e.start_date,
      probation_end_date: e.probation_end_date,
      status_employee: e.status_employee,
      bank_name: e.bank_name,
      account_number: e.account_number,
      account_name: e.account_name,
      father_name: e.father_name,
      father_birthdate: e.father_birthdate,
      father_occupation: e.father_occupation,
      mother_name: e.mother_name,
      mother_birthdate: e.mother_birthdate,
      mother_occupation: e.mother_occupation,
      spouse_name: e.spouse_name,
      spouse_birthdate: e.spouse_birthdate,
      spouse_occupation: e.spouse_occupation,
      total_siblings: e.total_siblings,
      order_of_siblings: e.order_of_siblings,
      total_children: e.total_children,
      total_boys: e.total_boys,
      total_girls: e.total_girls,
      language_speaking: e.language_speaking,
      language_reading: e.language_reading,
      language_writing: e.language_writing,
      criminal_record: e.criminal_record,
      upcountry_areas: e.upcountry_areas,

      employee_type: {
        employee_type_id: e.employee_type_id,
        // ตัดชื่อ employee_type_name ออก เพราะไม่ได้ join ตารางนั้นแล้ว
      },

      address_house: {
        address: e.house_address,
        sub_district: e.house_sub_district,
        district: e.house_district,
        province: e.house_province,
        postal_code: e.postal_code,
      },

      address_card: {
        address: e.card_address,
        sub_district: e.card_sub_district,
        district: e.card_district,
        province: e.card_province,
        postal_code: e.postal_code,
      },

      contact_person1: {
        name: e.cp1_name,
        relationship: e.cp1_relationship,
        mobile: e.cp1_mobile,
        address: e.cp1_address,
      },

      contact_person2: {
        name: e.cp2_name,
        relationship: e.cp2_relationship,
        mobile: e.cp2_mobile,
        address: e.cp2_address,
      },
    }));

    res.status(200).json({
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: totalPages,
      }
    });

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
};




exports.getEmployeeById = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    const [rows] = await conn.query(`
      SELECT 
        e.*,

        ah.address AS house_address,
        ah.sub_district AS house_sub_district,
        ah.district AS house_district,
        ah.province AS house_province,
        ah.postal_code AS house_postal_code,

        ac.address AS card_address,
        ac.sub_district AS card_sub_district,
        ac.district AS card_district,
        ac.province AS card_province,
        ac.postal_code AS card_postal_code,

        cp1.name AS cp1_name,
        cp1.relationship AS cp1_relationship,
        cp1.mobile AS cp1_mobile,
        cp1.address AS cp1_address,

        cp2.name AS cp2_name,
        cp2.relationship AS cp2_relationship,
        cp2.mobile AS cp2_mobile,
        cp2.address AS cp2_address

      FROM employee e
      LEFT JOIN address_house ah ON e.address_house_id = ah.address_house_id
      LEFT JOIN address_card ac ON e.address_card_id = ac.address_card_id
      LEFT JOIN contact_person1 cp1 ON e.contact_person1_id = cp1.contact_person1_id
      LEFT JOIN contact_person2 cp2 ON e.contact_person2_id = cp2.contact_person2_id
      WHERE e.employee_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const e = rows[0];
    const data = {
      employee_id: e.employee_id,
      first_name: e.first_name,
      last_name: e.last_name,
      nickname: e.nickname,
      pic_path: e.pic_path,
      email_person: e.email_person,
      mobile_no: e.mobile_no,
      birth_date: e.birth_date,
      gender: e.gender,
      nationality: e.nationality,
      religion: e.religion,
      marital_status: e.marital_status,
      line_id: e.line_id,
      id_card_number: e.id_card_number,
      id_card_issued_date: e.id_card_issued_date,
      id_card_expiry_date: e.id_card_expiry_date,
      position: e.position,
      salary: e.salary,
      start_date: e.start_date,
      probation_end_date: e.probation_end_date,
      status_employee: e.status_employee,
      bank_name: e.bank_name,
      account_number: e.account_number,
      account_name: e.account_name,
      father_name: e.father_name,
      father_birthdate: e.father_birthdate,
      father_occupation: e.father_occupation,
      mother_name: e.mother_name,
      mother_birthdate: e.mother_birthdate,
      mother_occupation: e.mother_occupation,
      spouse_name: e.spouse_name,
      spouse_birthdate: e.spouse_birthdate,
      spouse_occupation: e.spouse_occupation,
      total_siblings: e.total_siblings,
      order_of_siblings: e.order_of_siblings,
      total_children: e.total_children,
      total_boys: e.total_boys,
      total_girls: e.total_girls,
      language_speaking: e.language_speaking,
      language_reading: e.language_reading,
      language_writing: e.language_writing,
      criminal_record: e.criminal_record,
      upcountry_areas: e.upcountry_areas,

      address_house: {
        address: e.house_address,
        sub_district: e.house_sub_district,
        district: e.house_district,
        province: e.house_province,
        postal_code: e.house_postal_code,
      },

      address_card: {
        address: e.card_address,
        sub_district: e.card_sub_district,
        district: e.card_district,
        province: e.card_province,
        postal_code: e.card_postal_code,
      },

      contact_person1: {
        name: e.cp1_name,
        relationship: e.cp1_relationship,
        mobile: e.cp1_mobile,
        address: e.cp1_address,
      },

      contact_person2: {
        name: e.cp2_name,
        relationship: e.cp2_relationship,
        mobile: e.cp2_mobile,
        address: e.cp2_address,
      },
    };

    res.status(200).json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};
