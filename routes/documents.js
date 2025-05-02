const express = require('express');
const router = express.Router();
const fileModel = require('../models/fileModel');
const groupModel = require('../models/groupModel');

// Documents page
router.get("/documents", async (req, res) => {
    try {
        const documents = await fileModel.find({});
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
    console.log(`Assigning file ${req.params.id} to group ${groupId}`);
    res.redirect('/documents');
});

module.exports = router;
