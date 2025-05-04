const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');

// Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.render("pages/index", { error: "All fields are required" });
    }

    try {
        const user = await userModel.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.render("pages/index", { error: "Invalid username or password" });
        }

        req.session.user = { username: user.username };
        res.redirect("/home");
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send("Internal server error");
    }
});

// Signup
router.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.render("pages/index", { error: "All fields are required" });
    }

    try {
        const existing = await userModel.findOne({ username });
        if (existing) {
            return res.render("pages/index", { error: "Username already exists" });
        }

        const user = new userModel({ username, password });
        await user.save();

        req.session.user = { username: user.username };
        res.redirect("/");
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).send("Internal server error");
    }
});

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

module.exports = router;
