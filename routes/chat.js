const express = require('express');
const router = express.Router();

// Chat route
router.get("/chat", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    res.render("pages/chat");
});

module.exports = router;
