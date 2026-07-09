const bcrypt = require('bcrypt');
const db = require('./db');

(async () => {
    try {
        // 1. Supprimer l'ancien utilisateur si besoin
        await db.pool.query('DELETE FROM users WHERE email = ?', ['admin@test.com']);
        console.log('✅ Ancien utilisateur supprimé');

        // 2. Définir les infos du nouvel utilisateur
        const name = 'Nouvel Admin';
        const email = 'admin@nouveau.com';
        const password = 'monSuperMotDePasse123'; // Changez ici
        const role = 'admin';

        // 3. Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✅ Hash généré :', hashedPassword);

        // 4. Insérer dans la base
        await db.pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );
        console.log(`✅ Utilisateur créé avec succès !`);
        console.log(`   Email : ${email}`);
        console.log(`   Mot de passe : ${password}`);
        console.log(`   Rôle : ${role}`);

    } catch (err) {
        console.error('❌ Erreur :', err.message);
    } finally {
        process.exit();
    }
})();