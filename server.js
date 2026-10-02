const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
require("dotenv").config();

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "calisthenics-academy-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin.html", (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login.html");
  }

  res.sendFile(path.join(__dirname, "admin.html"));
});

app.use(express.static(__dirname));

app.post("/api/book-trial", async (req, res) => {
  const {
    name,
    fullName,
    age,
    gender = "",
    phone,
    contactNumber,
    goal = ""
  } = req.body;

  const leadName = String(fullName || name || "").trim();
  const leadAge = Number(age);
  const leadPhone = String(contactNumber || phone || "").trim();
  const leadGender = String(gender || "").trim();
  const fitnessGoal = String(goal || "").trim();

  if (!leadName || !leadAge || !leadPhone) {
    return res.status(400).json({
      success: false,
      message: "Full Name, Age, and Contact Number are required."
    });
  }

  if (!Number.isInteger(leadAge) || leadAge <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid age."
    });
  }

  try {
    await db.execute(
      `INSERT INTO leads (full_name, age, gender, contact_number, fitness_goal)
       VALUES (?, ?, ?, ?, ?)`,
      [leadName, leadAge, leadGender, leadPhone, fitnessGoal]
    );

    return res.status(201).json({
      success: true,
      message: "Free trial request saved successfully."
    });
  } catch (error) {
    console.error("Error saving lead:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save your request right now. Please try again later."
    });
  }
});

app.get("/api/leads", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM leads ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching leads:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch leads"
    });
  }
});

app.get("/api/check-auth", (req, res) => {
  if (req.session && req.session.isLoggedIn) {
    return res.status(200).json({
      success: true
    });
  }

  return res.status(401).json({
    success: false
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout failed"
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      success: true
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM admin WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    const admin = rows[0];

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    req.session.isLoggedIn = true;
    req.session.adminId = admin.id;
    req.session.username = admin.username;

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Session error"
        });
      }

      return res.json({
        success: true,
        message: "Login successful.",
        redirect: "admin.html"
      });
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
});

app.delete("/api/leads/:leadId", async (req, res) => {
  const { leadId } = req.params;

  try {
    const [result] = await db.execute(
      "DELETE FROM leads WHERE id = ?",
      [leadId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    return res.json({
      success: true,
      message: "Lead deleted successfully"
    });

  } catch (error) {
    console.error("Delete error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete lead"
    });
  }
});

app.post("/api/change-password", async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const adminId = req.session.adminId;

    if (!req.session.isLoggedIn || !adminId) {
      return res.status(401).json({
        success: false,
        message: "Not logged in"
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM admin WHERE id = ?",
      [adminId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Old password is incorrect"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute(
      "UPDATE admin SET password = ? WHERE id = ?",
      [hashedPassword, adminId]
    );

    return res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});