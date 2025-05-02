const express = require('express');
const router = express.Router();
const fileModel = require('../models/fileModel');
const groupModel = require('../models/groupModel');
const HTMLtoDOCX = require('html-to-docx');
const mammoth = require('mammoth');
const path = require('path');
const { ObjectId } = require('mongodb');

module.exports = (gfs, upload, db) => {
  // View files
  router.get('/file', async (req, res) => {
    const username = req.session.user?.username;
    if (!username) return res.redirect("/");

    try {
      const groups = await groupModel.find({ members: username });
      if (groups.length == 0) {
        return res.render("pages/file", {
          files: [], 
          groups, 
          selectedGroup: null,
          user: req.session.user || null
        });
      }
      const selectedGroup = req.query.group || (groups[0]?._id.toString()) || null;
      const query = selectedGroup ? { group: new ObjectId(selectedGroup) }: {};
      const files = await fileModel.find(query);
      

      if (req.xhr) {
        return res.json({files});
      }

      res.render("pages/file", {
        files,
        groups,
        selectedGroup,
        user: req.session.user || null
      });
    } catch (err) {
      console.error("Error fetching files or groups:", err);
      res.status(500).send("Error fetching files or groups");
    }
  });

  // Upload file
  router.post("/file/upload", upload.single("uploadedFile"), async (req, res) => {
    if (!req.file || !req.session.user?.username) {
      return res.status(400).send("Missing file or user session");
    }

    const safeFilename = `${Date.now()}-${req.file.originalname}`;
    const uploadStream = gfs.openUploadStream(safeFilename, {
      contentType: req.file.mimetype
    });

    uploadStream.write(req.file.buffer);
    uploadStream.end();

    uploadStream.on("finish", async () => {
      try {
        const fileEntry = new fileModel({
          originalName: req.file.originalname,
          storedName: safeFilename,
          path: `/preview/${safeFilename}`,
          owner: req.session.user.username
        });

        await fileEntry.save();
        res.redirect("/documents");
      } catch (err) {
        console.error("Error saving file metadata:", err);
        res.status(500).send("Upload succeeded but metadata failed to save.");
      }
    });

    uploadStream.on("error", (err) => {
      console.error("Error uploading file to GridFS:", err);
      res.status(500).send("GridFS upload failed.");
    });
  });

  // Edit file
  router.get('/file/:id/edit', async (req, res) => {
    try {
      const doc = await fileModel.findById(req.params.id);
      if (!doc) return res.status(404).send('Document not found');

      const ext = path.extname(doc.storedName).toLowerCase();
      const fileStream = gfs.openDownloadStreamByName(doc.storedName);
      const chunks = [];

      fileStream.on('data', chunk => chunks.push(chunk));
      fileStream.on('end', async () => {
        const buffer = Buffer.concat(chunks);

        if (ext === '.txt') {
          const content = buffer.toString('utf8');
          res.render('pages/editor', { doc, content });
        } else if (ext === '.docx') {
          try {
            const result = await mammoth.convertToHtml({ buffer });
            res.render('pages/editor', { doc, content: result.value });
          } catch (err) {
            console.error("Mammoth conversion failed:", err);
            res.status(500).send("Could not convert .docx to HTML");
          }
        } else {
          res.status(415).send("Unsupported file type");
        }
      });

      fileStream.on('error', err => {
        console.error("GridFS read error:", err);
        res.status(500).send("Could not read file");
      });
    } catch (err) {
      console.error("Error opening file:", err);
      res.status(500).send("Could not open file for editing");
    }
  });

  // Save file
  router.post('/file/:id/save', async (req, res) => {
    try {
      const doc = await fileModel.findById(req.params.id);
      if (!doc) return res.status(404).send('Document not found');

      const content = req.body.content;
      const ext = path.extname(doc.storedName).toLowerCase();

      const oldFiles = await gfs.find({ filename: doc.storedName }).toArray();
      if (oldFiles.length > 0) await gfs.delete(oldFiles[0]._id);

      let bufferToWrite;
      if (ext === '.txt') {
        bufferToWrite = Buffer.from(content, 'utf8');
      } else if (ext === '.docx') {
        bufferToWrite = await HTMLtoDOCX(content, "", {}, "");
      } else {
        return res.status(415).send("Unsupported file type");
      }

      const uploadStream = gfs.openUploadStream(doc.storedName, {
        contentType: ext === '.txt' ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      uploadStream.end(bufferToWrite);

      uploadStream.on('finish', () => res.redirect('/documents'));
      uploadStream.on('error', err => {
        console.error("Upload error:", err);
        res.status(500).send("Could not save file");
      });
    } catch (err) {
      console.error("Error saving file:", err);
      res.status(500).send("Could not save file");
    }
  });

  // Update metadata
  router.post("/file/update-metadata", async (req, res) => {
    const { fileId, author, modDate } = req.body;

    if (!fileId) return res.status(400).send("Missing fileId");

    try {
      const updateField = {};
      if (author) updateField["metadata.author"] = author;
      if (modDate) updateField["metadata.modifiedAt"] = new Date(modDate);

      const result = await db.collection("fs.files").updateOne(
        { _id: new ObjectId(fileId) },
        { $set: updateField }
      );

      if (result.matchedCount === 0) return res.status(404).send("File not found");
      res.status(200).send("Metadata updated successfully");
    } catch (err) {
      console.error("Error updating metadata:", err);
      res.status(500).send("Error updating metadata");
    }
  });

  return router;
};