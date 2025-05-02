const express = require('express');
const mongoose = require('mongoose');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const session = require('express-session');
const multer = require('multer');
const path = require('path');

// connect to mongoose
async function main() {
    await mongoose.connect('mongodb://localhost:27017/testDatabase');
}
main().then(() => console.log("Connected to mongoDB")).catch(error => console.log("Something went wrong: " + error));
const conn = mongoose.connection;

// set up models
const fileModel = require("./models/fileModel");
const groupModel = require("./models/groupModel");
const userModel = require("./models/userModel");
const messageModel = require("./models/messageModel");

// set up gfs for file storage
let gfs;

// multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

conn.once('open', () => {
    console.log("MongoDB connection open");
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });

    // Register routes that depend on gfs
    const fileRoutes = require('./routes/file')(gfs, upload, mongoose.connection.db);
    const previewRoutes = require('./routes/preview')(gfs);
    app.use(fileRoutes);
    app.use(previewRoutes);
});

// session middleware
app.use(session({
    secret: "secureSessionSecret",
    resave: false,
    saveUninitialized: true
}));

// app config
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// middleware to inject user into all views
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// mount routes
app.use(require('./routes/auth'));
app.use(require('./routes/home'));
app.use(require('./routes/profile'));
app.use(require('./routes/chat'));
app.use(require('./routes/groups'));
app.use(require('./routes/documents'));

// socket.io chat
io.on("connection", function (socket) {
    let currentRoom = null;

    socket.on('joinGroup', (groupId) => {
        if (currentRoom) {
            socket.leave(currentRoom);
        }
        currentRoom = groupId;
        socket.join(groupId);
    });

    socket.on("leaveGroup", (groupId) => {
        socket.leave(groupId);
        if (currentRoom == groupId) currentRoom = null;
    });

    socket.on("groupMessage", async ({ groupId, message }) => {
        const timestamp = Date.now();
        const sender = socket.handshake.auth?.username || "User";
        const savedMessage = await messageModel.create({
            groupId, sender, message, timestamp
        });
        io.to(groupId).emit("groupMessage", { sender, message, timestamp });
    });

    socket.on("chat message", function (msg) {
        io.emit("chat message", msg);
    });
});

// start server
http.listen(3000, function () {
    console.log("listening on port 3000");
});