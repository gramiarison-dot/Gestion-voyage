// test-insert.js
const db = require('./db');
const bcrypt = require('bcrypt');

(async () => {
    try {
        const testEmail = 'unittest@test.com';
        const hash = await bcrypt.hash('test123', 10);
        const id = await db.createUser(testEmail, hash, 'client');
        console.log('✅ Insertion réussie, ID:', id);
    } catch (err) {
        console.error('❌ Erreur:', err.message);
    }
})();