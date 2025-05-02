// routes/index.js
const express = require("express");
const router = express.Router();
const userModel = require("../models/userModel");

router.get("/", (req, res) => {
  if (req.session.user) {
    res.render("pages/home");
  } else {
    res.render("pages/index", { error: null });
  }
});

router.get("/home", (req, res) => {
  res.render("pages/home");
});

router.get("/profile", async (req, res) => {
  if (!req.session.user) return res.redirect("/");

  try {
    const user = await userModel.findOne({ username: req.session.user.username });
    if (!user) return res.redirect("/");
    res.render("pages/profile", { user });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).send("Error loading profile");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

module.exports = router;