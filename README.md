# Ride Sharing Application - Server

This repository contains the backend server for a comprehensive ride-sharing platform connecting passengers and drivers. The application is built to handle user authentication, ride management, real-time tracking, and more.

## Tech Stack

- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Environment Management:** dotenv
- **CORS:** Enabled for cross-origin requests

## Features Breakdown

The application is divided into three main sections: Public Pages, Passenger Portal, and Driver Portal.

### 1. Main Public Pages

- **Landing Page:**
  - Responsive Navbar.
  - Hero Section introducing the service.
  - About Us summary.
  - Testimonials from users.
  - Contact form/details.
  - Footer with links.
- **About Us Page:** Detailed information about the company, teams section, and motive.
- **How It Works:** detailed guides for both Passengers and Drivers.
- **FAQ:** Common questions and answers.

### 2. Passenger Pages

- **Authentication:**
  - **Register:** Full Name, Email, Password, Phone Number.
  - **Login:** Email and Password (Token stored in localStorage).
- **Profile:** Display and manage profile details.
- **Ride Management:**
  - **Search Ride:** Enter drop-off location and required seats.
  - **Ride Results:** Display relevant ride options.
  - **Ride Details:** In-depth view including driver info, vehicle, and co-passengers.
  - **Book Ride:** Form to confirm pickup location and view fare.
  - **Track Ride:** Real-time tracking with status updates after acceptance.
  - **My Bookings:** History and status of all bookings.
- **Reviews:** System for passengers to review their rides.

### 3. Driver Pages

- **Authentication:**
  - **Login:** Email and Password (Token stored in localStorage).
  - **Register:** Full Name, Email, Password, Phone Number, CNIC, Gender, Driving License, Profile Picture.
- **Profile:** Driver information display.
- **Trip Management:**
  - **Post Ride:** Form to create a new ride (Current Location, Available Seats, Status, Stops/Fare, Dropoff).
  - **Confirm Ride:** Interface to accept/reject passenger requests.
  - **Live Trip Track:** Location tracking activation upon ride confirmation.
  - **My Rides:** History of all posted rides.
- **Earnings:** Dashboard displaying driver earnings.

## Setup Instructions

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Setup:**
    Ensure you have a `.env` file in the root directory with necessary variables (PORT, MONGO_URI, JWT_SECRET, etc.).
4.  **Run the development server:**
    ```bash
    npm run dev
    ```
5.  **Run the production server:**
    ```bash
    npm start
    ```