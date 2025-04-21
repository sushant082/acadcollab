const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    owner: {
        type: String, // username of the owner
        required: true
    },
    members: {
        type: [String], // array of usernames
        default: []
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
});

groupSchema.statics.listAllGroups = function () {
    return this.find({});
};

const groupModel = mongoose.model('group', groupSchema);

module.exports = groupModel;
