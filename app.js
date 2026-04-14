const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.set("view engine", "ejs");

// Session setup
app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true,
  })
);

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "booking_system",
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// Home route
app.get("/", (req, res) => {
  res.send("Booking System is running...");
});

// Show register page
app.get("/register", (req, res) => {
  res.render("register");
});

// Show login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Registration logic
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hashedPassword],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.send("Error creating account");
      }
      res.send("Registration successful!");
    }
  );
});

// Login logic
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.send("Error");
    if (results.length === 0) return res.send("User not found");

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.send("Incorrect password");

    req.session.user = user;
    res.redirect("/dashboard");
  });
});

// Dashboard (protected)
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("dashboard", { user: req.session.user });
});

// Show booking page (protected)
app.get("/booking", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("booking");
});

// Handle booking form submission
app.post("/booking", (req, res) => {
  const { date, time, service } = req.body;
  const userId = req.session.user.id;

  db.query(
    "INSERT INTO bookings (user_id, date, time, service) VALUES (?, ?, ?, ?)",
    [userId, date, time, service],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.send("Error saving booking");
      }
      res.send("Booking successful!");
    }
  );
});

// My Bookings (protected)
app.get("/mybookings", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  db.query(
    "SELECT * FROM bookings WHERE user_id = ? ORDER BY date, time",
    [req.session.user.id],
    (err, results) => {
      if (err) {
        console.log(err);
        return res.send("Error loading bookings");
      }
      res.render("mybookings", { bookings: results });
    }
  );
});

/* ============================
      CRUD — EDIT BOOKING
============================ */

// Edit booking page
app.get("/booking/edit/:id", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const bookingId = req.params.id;

  db.query(
    "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
    [bookingId, req.session.user.id],
    (err, results) => {
      if (err || results.length === 0) {
        return res.send("Booking not found");
      }
      res.render("editbooking", { booking: results[0] });
    }
  );
});

// Update booking
app.post("/booking/update/:id", (req, res) => {
  const { date, time, service } = req.body;
  const bookingId = req.params.id;

  db.query(
    "UPDATE bookings SET date = ?, time = ?, service = ? WHERE id = ? AND user_id = ?",
    [date, time, service, bookingId, req.session.user.id],
    (err, result) => {
      if (err) return res.send("Error updating booking");
      res.redirect("/mybookings");
    }
  );
});

/* ============================
      CRUD — DELETE BOOKING
============================ */

app.get("/booking/delete/:id", (req, res) => {
  const bookingId = req.params.id;

  db.query(
    "DELETE FROM bookings WHERE id = ? AND user_id = ?",
    [bookingId, req.session.user.id],
    (err, result) => {
      if (err) return res.send("Error deleting booking");
      res.redirect("/mybookings");
    }
  );
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
