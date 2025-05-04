// routes/profile.js
const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');
const fileModel = require('../models/fileModel');

// Profile page
router.get("/profile", async (req, res) => {
    if (!req.session.user) return res.redirect('/');

    try {
        const user = await userModel.findOne({ username: req.session.user.username });
        if (!user) return res.redirect('/');
        res.render("pages/profile", { user, error: null, success: null });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Error loading profile");
    }
});

// Change password
router.post("/profile/change-password", async (req, res) => {
    const username = req.session.user?.username;
    const { currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
        return res.status(400).send("Missing required fields");
    }

    try {
        const user = await userModel.findOne({ username });
        if (!user) return res.redirect("/");

        const match = await user.comparePassword(currentPassword);
        if (!match) {
            return res.render("pages/profile", { user, error: "Incorrect current password", success: null });
        }

        user.password = newPassword;
        await user.save();

        res.render("pages/profile", { user, error: null, success: "Password changed successfully" });
    } catch (err) {
        console.error("Error changing password:", err);
        res.status(500).send("Error changing password");
    }
});

// Delete account
router.post("/profile/delete-account", async (req, res) => {
    const username = req.session.user?.username;
    const { password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Missing credentials");
    }

    try {
        const user = await userModel.findOne({ username });
        if (!user) return res.redirect('/');

        const match = await user.comparePassword(password);
        if (!match) {
            return res.render("pages/profile", { user, error: "Incorrect password", success: null });
        }

        await fileModel.deleteMany({ owner: username });
        await userModel.deleteOne({ username });

        req.session.destroy(() => {
            res.redirect("/");
        });
    } catch (err) {
        console.error("Error deleting account:", err);
        res.status(500).send("Error deleting account");
    }
});

module.exports = router;
