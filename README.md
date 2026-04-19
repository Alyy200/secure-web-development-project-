# secure-web-development-project-
Booking System -Secure Web Development CA.

A safe Node.js + Express reservation system created as a part of the Secure Web Development course at the National College of Ireland.

This project portrays good coding practices, authentication, role-based access control, CRUD operations and secure session management.

 Features
 Authentication & Security
- Registration of the user with input validation.
- Hashing of passwords with bcrypt.
- Sessions and secure login system.
- Access control (Role-based access control): Admin and User.
- Protected routes (middleware)
- SQL defense with prepared statements.
- Email, password and booking date validation.
 Booking System
- Reservations can be made by users.
- Customers are able to see, modify and cancel their reservations.
- Admin will be able to see all bookings.
- Admin is able to cancel any booking.
 Admin Dashboard
- View total users
- View total bookings
- Change users (delete non-admin users)
- Manage bookings
-  Tech Stack

- Node.js
- Express.js
- mysql
- MySQL (mysql2)
- EJS Templates
- Express-Session
- bcrypt
- Connection Pooling
Project Structure
booking-system/
│── app.js
│── package.json
│── public/
│── views/
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   ├── booking.ejs
│   ├── mybookings.ejs
│   ├── editbooking.ejs
│   └── admin.ejs
│── .env (not included)
Running the Project
Install dependencies:
npm install
Start the server:
node app.js
Open in browser:
http://localhost:3000

 Environment Variables
Create a `.env` file with:
SESSION_SECRET=yourSecretKey

 Database Structure
 users table
id (INT, Primary Key)
name (VARCHAR)
email (VARCHAR, UNIQUE)
password (VARCHAR)
role (VARCHAR)

 bookings table
id (INT, Primary Key)
user_id (INT, Foreign Key)
date (DATE)
time (TIME)
service (VARCHAR)
## Demo Video (CA Requirement)

The demo video will demonstrate:
- User registration and login
- Creating a booking
- Viewing bookings
- Editing a booking
- Deleting a booking
- Admin dashboard features
- Security features (validation, sessions, role-based access)
- Code explanation

  Author
Syed Junaid Ali  
MSc Cybersecurity – National College of Ireland
student id X25172735

