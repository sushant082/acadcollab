const express = require('express');
const router = express.Router();
const messageModel = require('../models/messageModel');
const groupModel = require('../models/groupModel');

// Chat route
router.get("/chat", async (req, res) => {
    if (!req.session.user) return res.redirect("/");
    const groups = await groupModel.find({members: req.session.user.username});
    res.render("pages/chat", {
        groups, user: req.session.user
    });
});

router.get('/chat/messages/:groupId', async(req, res) => {
    const {groupId} = req.params;
    const messages = await messageModel.find({groupId}).sort({timestamp: 1});
    res.json(messages);
})


module.exports = router;
