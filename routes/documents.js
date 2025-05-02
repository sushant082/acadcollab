const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const fileModel = require('../models/fileModel');
const groupModel = require('../models/groupModel');

// Documents page
router.get("/documents", async (req, res) => {
    try {
        const documents = await fileModel.find({}).populate('group');
        const groups = await groupModel.find({});
        res.render("pages/documents", { documents, groups });
    } catch (err) {
        console.error("Error fetching documents:", err);
        res.status(500).send("Error loading documents");
    }
});

// File delete (basic)
router.post("/file/:id/delete", async (req, res) => {
    await fileModel.findByIdAndDelete(req.params.id);
    res.redirect('/documents');
});

// Assign group to file
router.post("/file/:id/assign-group", async (req, res) => {
    const { groupId } = req.body;
    try {
        await fileModel.findByIdAndUpdate(req.params.id, { group: new mongoose.Types.ObjectId(groupId) });
        console.log(`Assigning file ${req.params.id} to group ${groupId}`);
        res.redirect('/documents');
    }
    catch (err) {
        console.error('Error assigning group:', err);
        res.status(500).send('Failed to assign group')
    }
});

module.exports = router;
