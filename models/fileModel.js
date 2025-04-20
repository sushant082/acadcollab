var mongoose = require("mongoose");

var albumSchema = new mongoose.Schema({
    originalName: String,
    storedName: String,
    path: String, 
    uploadDate: {
        type: Date,    
        default: Date.now
    }
});

albumSchema.statics.listAllAlbums = function() {
    return this.find({})
};

var albumModel = mongoose.model('album', albumSchema);

module.exports = albumModel;