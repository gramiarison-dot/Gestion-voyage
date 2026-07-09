async function updateNavbar() {
    const nav = document.getElementById('navLinks');
    try {
        const res = await fetch('/api/user');
        if (res.ok) {
            const user = await res.json();
            let adminLink = '';
            if (user.role === 'admin') {
                adminLink = `<li class="nav-item"><a class="nav-link" href="/admin/dashboard">Admin</a></li>`;
            }
            nav.innerHTML = `
                <li class="nav-item"><a class="nav-link" href="/historique">Historique</a></li>
                ${adminLink}
                <li class="nav-item"><span class="nav-link">Bonjour, ${user.name}</span></li>
                <li class="nav-item"><a class="nav-link" href="#" onclick="logout()">Déconnexion</a></li>
            `;
        } else {
            nav.innerHTML = `
                <li class="nav-item"><a class="nav-link" href="/login">Connexion</a></li>
                <li class="nav-item"><a class="nav-link" href="/register">Inscription</a></li>
            `;
        }
    } catch (err) {}
}

async function logout() {
    await fetch('/api/auth/logout');
    window.location.href = '/';
}