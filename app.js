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
    secret: process.env.SESSION_SECRET || "devsecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// FIXED: MySQL Connection Pool (never closes)
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "booking_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Validation helpers
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(pw) {
  return typeof pw === "string" && pw.length >= 8;
}

function isFutureDate(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= new Date(today.toDateString());
}

// Home
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Register page
app.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

// Login page
app.get("/login", (req, res) => {
  res.render("login", { error: null, success: null });
});

// Register logic
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.render("register", { error: "All fields required.", success: null });

  if (!isValidEmail(email))
    return res.render("register", { error: "Invalid email format.", success: null });

  if (!isStrongPassword(password))
    return res.render("register", { error: "Password must be 8+ characters.", success: null });

  db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.render("register", { error: "Server error.", success: null });

    if (results.length > 0)
      return res.render("register", { error: "Email already registered.", success: null });

    const hashed = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
      [name, email, hashed],
      (err2) => {
        if (err2) return res.render("register", { error: "Error creating account.", success: null });

        res.render("login", { error: null, success: "Registration successful. Please log in." });
      }
    );
  });
});

// Login logic
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.render("login", { error: "Email and password required.", success: null });

  if (!isValidEmail(email))
    return res.render("login", { error: "Invalid email format.", success: null });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.render("login", { error: "Server error.", success: null });

    if (results.length === 0)
      return res.render("login", { error: "User not found.", success: null });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.render("login", { error: "Incorrect password.", success: null });

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (user.role === "admin") return res.redirect("/admin");

    res.redirect("/dashboard");
  });
});

// Auth middleware
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  if (req.session.user.role !== "admin") return res.send("Access denied");
  next();
}

// Dashboard
app.get("/dashboard", requireLogin, (req, res) => {
  res.render("dashboard", { user: req.session.user });
});

// Admin dashboard
app.get("/admin", requireAdmin, (req, res) => {
  db.query("SELECT COUNT(*) AS totalUsers FROM users", (err1, uCount) => {
    db.query("SELECT COUNT(*) AS totalBookings FROM bookings", (err2, bCount) => {
      db.query("SELECT id, name, email, role FROM users", (err3, users) => {
        db.query("SELECT * FROM bookings ORDER BY date, time", (err4, bookings) => {
          res.render("admin", {
            user: req.session.user,
            users,
            bookings,
            stats: {
              totalUsers: uCount[0].totalUsers,
              totalBookings: bCount[0].totalBookings,
            },
            error: null,
            success: null,
          });
        });
      });
    });
  });
});

// Admin delete user
app.post("/admin/user/delete/:id", requireAdmin, (req, res) => {
  db.query("DELETE FROM users WHERE id = ? AND role != 'admin'", [req.params.id], () => {
    res.redirect("/admin");
  });
});

// Admin delete booking
app.post("/admin/booking/delete/:id", requireAdmin, (req, res) => {
  db.query("DELETE FROM bookings WHERE id = ?", [req.params.id], () => {
    res.redirect("/admin");
  });
});

// Booking page
app.get("/booking", requireLogin, (req, res) => {
  res.render("booking", { error: null, success: null });
});

// Create booking
app.post("/booking", requireLogin, (req, res) => {
  const { date, time, service } = req.body;

  if (!date || !time || !service)
    return res.render("booking", { error: "All fields required.", success: null });

  if (!isFutureDate(date))
    return res.render("booking", { error: "Date must be today or future.", success: null });

  db.query(
    "INSERT INTO bookings (user_id, date, time, service) VALUES (?, ?, ?, ?)",
    [req.session.user.id, date, time, service],
    (err) => {
      if (err) return res.render("booking", { error: "Error saving booking.", success: null });

      res.render("booking", { error: null, success: "Booking created successfully." });
    }
  );
});

// My bookings
app.get("/mybookings", requireLogin, (req, res) => {
  db.query(
    "SELECT * FROM bookings WHERE user_id = ? ORDER BY date, time",
    [req.session.user.id],
    (err, results) => {
      res.render("mybookings", {
        bookings: results || [],
        error: null,
        success: null,
      });
    }
  );
});

// Edit booking
app.get("/booking/edit/:id", requireLogin, (req, res) => {
  db.query(
    "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
    [req.params.id, req.session.user.id],
    (err, results) => {
      if (!results || results.length === 0) return res.send("Booking not found");

      res.render("editbooking", {
        booking: results[0],
        error: null,
        success: null,
      });
    }
  );
});

// Update booking
app.post("/booking/update/:id", requireLogin, (req, res) => {
  const { date, time, service } = req.body;

  if (!date || !time || !service)
    return res.send("All fields required");

  if (!isFutureDate(date))
    return res.send("Date must be today or future");

  db.query(
    "UPDATE bookings SET date = ?, time = ?, service = ? WHERE id = ? AND user_id = ?",
    [date, time, service, req.params.id, req.session.user.id],
    () => res.redirect("/mybookings")
  );
});

// Delete booking
app.get("/booking/delete/:id", requireLogin, (req, res) => {
  db.query(
    "DELETE FROM bookings WHERE id = ? AND user_id = ?",
    [req.params.id, req.session.user.id],
    () => res.redirect("/mybookings")
  );
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
