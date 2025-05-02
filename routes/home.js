const express = require('express');
const router = express.Router();

// Root route
router.get("/", (req, res) => {
    if (req.session.user) {
        res.render("pages/home");
    } else {
        res.render("pages/index", { error: null });
    }
});

// Home route
router.get("/home", (req, res) => {
    res.render("pages/home");
});

module.exports = router;
