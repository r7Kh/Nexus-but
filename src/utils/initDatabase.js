const fs = require('fs');
const path = require('path');

const dbFolder = path.join(__dirname, '../database');
const warningsFile = path.join(dbFolder, 'warnings.json');

function initDatabase() {

    // 📁 إنشاء مجلد database إذا غير موجود
    if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder, { recursive: true });
        console.log('📁 تم إنشاء مجلد قاعدة البيانات');
    }

    // 📄 إنشاء ملف التحذيرات إذا غير موجود
    if (!fs.existsSync(warningsFile)) {
        fs.writeFileSync(warningsFile, '{}');
        console.log('📄 تم إنشاء ملف التحذيرات');
    }

    console.log('✅ قاعدة البيانات جاهزة');
}

module.exports = initDatabase;