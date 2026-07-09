// kill-port.js
const { exec } = require('child_process');

const PORT = 8081;

console.log(`🔍 Recherche du processus sur le port ${PORT}...`);

// Pour Windows
exec(`netstat -ano | findstr :${PORT}`, (err, stdout) => {
    if (err) {
        console.log('❌ Aucun processus trouvé sur ce port');
        return;
    }
    
    const lines = stdout.split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 4 && parts[3] === 'LISTENING') {
            pids.add(parts[4]);
        }
    });
    
    if (pids.size === 0) {
        console.log('✅ Aucun processus en écoute sur ce port');
        return;
    }
    
    pids.forEach(pid => {
        console.log(`🔄 Killing process PID: ${pid}`);
        exec(`taskkill /PID ${pid} /F`, (err) => {
            if (err) {
                console.error(`❌ Erreur pour le PID ${pid}:`, err.message);
            } else {
                console.log(`✅ Processus ${pid} tué avec succès`);
            }
        });
    });
});