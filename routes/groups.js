const express = require('express');
const router = express.Router();
const groupModel = require('../models/groupModel');
const userModel = require('../models/userModel');

// View groups
router.get("/groups", async (req, res) => {
    try {
        const groups = await groupModel.find({});
        const users = await userModel.find({}, "username");
        const user = req.session.user;

        let selectedGroup = null;
        if (req.query.groupId) {
            selectedGroup = await groupModel.findById(req.query.groupId);
        }

        res.render("pages/groups", {
            groups,
            users,
            user,
            selectedGroup,
            error: null
        });
    } catch (err) {
        console.error("Error fetching groups:", err);
        res.status(500).send("Error fetching groups");
    }
});

// Create group
router.post("/groups", async (req, res) => {
    const groupName = req.body.groupName;
    const username = req.session.user?.username;

    if (!groupName || !username) {
        return res.status(400).send("Group name and user required");
    }

    try {
        const existingGroup = await groupModel.findOne({ name: groupName });
        if (existingGroup) {
            const groups = await groupModel.find({});
            const users = await userModel.find({}, "username");
            return res.render("pages/groups", {
                groups,
                users,
                error: null,
                user: req.session.user
            });
        }

        const newGroup = new groupModel({
            name: groupName,
            owner: username,
            members: [username]
        });

        await newGroup.save();
        res.redirect("/groups");
    } catch (err) {
        console.error("Error creating group: ", err);
        res.status(500).send("Failed to create group");
    }
});

// Add member
router.post("/groups/:id/add-member", async (req, res) => {
    const groupId = req.params.id;
    const username = req.session.user?.username;
    const memberToAdd = req.body.memberUsername;

    try {
        const group = await groupModel.findById(groupId);
        if (!group) return res.status(404).send("Group not found");
        if (group.owner !== username) return res.status(403).send("Unauthorized");

        if (!group.members.includes(memberToAdd)) {
            group.members.push(memberToAdd);
            await group.save();
        }

        res.redirect("/groups");
    } catch (err) {
        console.error("Error adding member:", err);
        res.status(500).send("Failed to add member");
    }
});

// Remove member
router.post("/groups/:id/remove-member", async (req, res) => {
    const groupId = req.params.id;
    const username = req.session.user?.username;
    const memberToRemove = req.body.memberUsername;

    try {
        const group = await groupModel.findById(groupId);
        if (!group || group.owner !== username) {
            return res.status(403).send("Unauthorized");
        }

        group.members = group.members.filter(m => m !== memberToRemove);
        await group.save();

        res.redirect("/groups");
    } catch (err) {
        console.error("Error removing member:", err);
        res.status(500).send("Internal server error");
    }
});

// Delete group
router.post("/groups/:id/delete", async (req, res) => {
    const groupId = req.params.id;
    const username = req.session.user?.username;
    const { password } = req.body;

    try {
        const user = await userModel.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(403).send("Invalid password or unauthorized");
        }

        const group = await groupModel.findById(groupId);
        if (!group || group.owner !== username) {
            return res.status(403).send("You are not authorized to delete this group");
        }

        await groupModel.findByIdAndDelete(groupId);
        res.redirect("/groups");
    } catch (err) {
        console.error("Error deleting group:", err);
        res.status(500).send("Failed to delete group");
    }
});

module.exports = router;