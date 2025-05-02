const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true},
    sender: {type: String, required: true},
    message: {type: String, required: true},
    timestamp: {type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);