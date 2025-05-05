const express = require('express');
const path = require('path');
const router = express.Router();

module.exports = (gfs) => {
  router.get('/preview/:filename', async (req, res) => {
    if (!gfs) return res.status(503).send("GridFS not initialized");

    try {
      res.set('Cache-Control', 'no-store');

      // Find the most recent file with the given filename
      const files = await gfs.find({ filename: req.params.filename })
                             .sort({ uploadDate: -1 })
                             .toArray();

      if (!files || files.length === 0) {
        return res.status(404).send("File not found");
      }

      const latestFile = files[0];
      const ext = path.extname(latestFile.filename).toLowerCase();

      // Force text files to render as HTML
      if (ext === '.txt') {
        res.set('Content-Type', 'text/html');
      } else {
        res.set('Content-Type', latestFile.contentType || 'application/octet-stream');
      }

      const readStream = gfs.openDownloadStream(latestFile._id);
      readStream.pipe(res);
    } catch (err) {
      console.error("Preview error:", err);
      res.status(500).send("Error previewing file");
    }
  });

  return router;
};
