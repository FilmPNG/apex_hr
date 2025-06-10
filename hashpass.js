const bcrypt = require('bcrypt');


// รหัสผ่านธรรมดาที่ต้องการเข้ารหัส
const plainPassword = '111111';

bcrypt.hash(plainPassword, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Plain password:', plainPassword);
  console.log('Hashed password:', hash);
});