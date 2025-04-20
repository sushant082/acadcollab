var mongoose = require("mongoose");

var userSchema = new mongoose.Schema({
    username: String,
    createdOn: {
        type: Date,    
        default: Date.now
    }
});

var userModel = mongoose.model('user', userSchema);

module.exports = userModel;