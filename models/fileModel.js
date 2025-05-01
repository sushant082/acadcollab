// models/fileModel.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  originalName: String,           // Original uploaded filename
  storedName: String,            // The name stored in GridFS (filename field)
  owner: String,                 // Username of uploader
  uploadDate: {                  // When file was uploaded
    type: Date,
    default: Date.now
  },
  path: String,                  // e.g., "/preview/<filename>"
  group: {                       // Optional group reference (if applicable)
    type: mongoose.Schema.Types.ObjectId,
    ref: "group",
    default: null
  }
});

module.exports = mongoose.model("file", fileSchema);

