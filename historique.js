async function loadHistory() {
    const res = await fetch('/api/reservations');
    if (res.status === 401) window.location.href = '/login';
    const reservations = await res.json();
    const tbody = document.querySelector('#historyTable tbody');
    if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Aucune réservation</td></tr>';
        return;
    }
    tbody.innerHTML = reservations.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${r.departure} → ${r.destination}</td>
            <td>${new Date(r.departure_time).toLocaleDateString()}</td>
            <td>${r.seats}</td>
            <td>${r.total_price} €</td>
            <td>${r.status}</td>
        </tr>
    `).join('');
}
loadHistory();