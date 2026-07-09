const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get('tripId');
let selectedSeats = [];
let reservedSeats = [];
let totalSeats = 0;
let tripPrice = 0;

async function loadTripAndSeats() {
    try {
        const tripRes = await fetch(`/api/trips/${tripId}`);
        const trip = await tripRes.json();
        tripPrice = trip.price;
        document.getElementById('tripInfo').innerHTML = `${trip.departure} → ${trip.destination} - ${new Date(trip.departure_time).toLocaleDateString()} - ${tripPrice}€/siège`;
        
        const seatsRes = await fetch(`/api/trips/${tripId}/seats`);
        const seatsData = await seatsRes.json();
        totalSeats = seatsData.totalSeats;
        reservedSeats = seatsData.reservedSeats;
        renderSeatMap();
    } catch (err) {
        console.error(err);
    }
}

function renderSeatMap() {
    const container = document.getElementById('seatMap');
    container.innerHTML = '';
    const cols = 4;
    const rows = Math.ceil(totalSeats / cols);
    const table = document.createElement('table');
    table.className = 'table table-bordered text-center';
    
    for (let r = 0; r < rows; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < cols; c++) {
            const seatNum = r * cols + c + 1;
            if (seatNum > totalSeats) break;
            const td = document.createElement('td');
            const btn = document.createElement('button');
            btn.textContent = seatNum;
            btn.className = 'btn seat-btn m-1';
            if (reservedSeats.includes(seatNum)) {
                btn.classList.add('btn-danger');
                btn.disabled = true;
            } else if (selectedSeats.includes(seatNum)) {
                btn.classList.add('btn-warning');
            } else {
                btn.classList.add('btn-outline-success');
            }
            btn.onclick = () => toggleSeat(seatNum);
            td.appendChild(btn);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    container.appendChild(table);
}

function toggleSeat(seatNum) {
    if (reservedSeats.includes(seatNum)) return;
    if (selectedSeats.includes(seatNum)) {
        selectedSeats = selectedSeats.filter(s => s !== seatNum);
    } else {
        selectedSeats.push(seatNum);
    }
    renderSeatMap();
}

document.getElementById('confirmBtn').addEventListener('click', async () => {
    if (selectedSeats.length === 0) {
        alert('Veuillez sélectionner au moins un siège');
        return;
    }
    // Check if user is logged in
    const userRes = await fetch('/api/user');
    if (userRes.status === 401) {
        alert('Veuillez vous connecter d\'abord');
        window.location.href = '/login';
        return;
    }
    
    const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: parseInt(tripId), seats: selectedSeats })
    });
    const data = await res.json();
    if (data.success) {
        window.location.href = `/confirmation?reservationId=${data.reservationId}`;
    } else {
        document.getElementById('message').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        if (data.error.includes('already reserved')) {
            loadTripAndSeats(); // refresh seat map
            selectedSeats = [];
        }
    }
});

loadTripAndSeats();