const express = require('express');
const router = express.Router();

module.exports = (gfs) => {
  router.get('/preview/:filename', async (req, res) => {
    if (!gfs) return res.status(503).send("GridFS not initialized");

    try {
      const files = await gfs.find({ filename: req.params.filename }).toArray();
      if (!files || files.length === 0) {
        return res.status(404).send("File not found");
      }

      const file = files[0];
      res.set('Content-Type', file.contentType || 'application/octet-stream');

      const readStream = gfs.openDownloadStreamByName(req.params.filename);
      readStream.pipe(res);
    } catch (err) {
      console.error("Preview error:", err);
      res.status(500).send("Error previewing file");
    }
  });

  return router;
};
