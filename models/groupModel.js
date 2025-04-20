var mongoose = require("mongoose");

var groupSchema = new mongoose.Schema({
    name: {
        type:String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,    
        default: Date.now
    }
});

groupSchema.statics.listAllGroups = function() {
    return this.find({})
};

var groupModel = mongoose.model('group', groupSchema);

module.exports = groupModel;