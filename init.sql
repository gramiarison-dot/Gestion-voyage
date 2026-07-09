-- Create database (run this separately if not created)
-- CREATE DATABASE travel_reservation;
-- USE travel_reservation;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('client', 'admin') DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    departure VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    total_seats INT NOT NULL DEFAULT 48,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    trip_id INT NOT NULL,
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE reserved_seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    trip_id INT NOT NULL,
    seat_number INT NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    UNIQUE KEY unique_trip_seat (trip_id, seat_number)
);

-- Insert admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin', 'admin@example.com', '$2b$10$5e2c4e6d8f0a2b4c6d8e0a2b4c6d8e0a2b4c6d8e0a2b4c6d8e0a2b4c6d8e', 'admin');

-- Insert sample trips
INSERT INTO trips (departure, destination, departure_time, arrival_time, total_seats, price) VALUES
('Paris', 'Lyon', '2026-06-15 08:00:00', '2026-06-15 10:30:00', 48, 45.00),
('Marseille', 'Nice', '2026-06-16 14:00:00', '2026-06-16 16:15:00', 48, 35.50),
('Bordeaux', 'Toulouse', '2026-06-17 09:30:00', '2026-06-17 11:45:00', 48, 40.00);