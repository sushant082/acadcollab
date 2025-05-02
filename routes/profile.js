const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');

// Profile page
router.get("/profile", async (req, res) => {
    if (!req.session.user) return res.redirect('/');

    try {
        const user = await userModel.findOne({ username: req.session.user.username });
        if (!user) return res.redirect('/');
        res.render("pages/profile", { user });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Error loading profile");
    }
});

module.exports = router;
