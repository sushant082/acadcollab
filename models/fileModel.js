var mongoose = require("mongoose");

var fileSchema = new mongoose.Schema({
    originalName: String,
    storedName: String,
    path: String, 
    uploadDate: {
        type: Date,    
        default: Date.now
    }
});

var fileModel = mongoose.model('file', fileSchema);

module.exports = fileModel;