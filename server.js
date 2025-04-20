var express = require('express');
var mongoose = require('mongoose');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var {MongoClient, GridFSBucket} = require('mongodb')
var multer = require('multer');
var path = require("path")

// connect to mongoose
async function main() {
    await mongoose.connect('mongodb://localhost:27017/testDatabase');
}
main().then(() => console.log("Connected to mongoDB")).catch(error => console.log("Something went wrong: " + error));
const conn = mongoose.connection;

// set up models
var fileModel = require("./models/fileModel"); // NEED TO IMPLEMENT
var groupModel = require("./models/groupModel");
var userModel = require("./models/userModel"); // NEED TO IMPLEMENT

// set up gfs for file storage
let gfs;
conn.once('open', () => {
    console.log("MongoDB connection open");
    // initialize gfs bucket
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
});
// set up multer for file uploading
const storage = multer.memoryStorage();
const upload = multer({ storage });

// set up app
app.set("view engine", "ejs");
app.use(express.urlencoded( {extended: true}));
app.use(express.json());
app.use(express.static(__dirname));

// default route
app.get("/", function(req, res) {
    res.render("pages/index");
});

// route to access chat
app.get("/chat", function (req, res) {
    //console.log("chat")
    res.render("pages/chat");
});

// route to access groups 
app.get("/groups", async function(req, res) {
    try {
        var groups = await groupModel.find({});
        res.render("pages/groups", { groups });
    } catch (err) {
        console.error("Error fetching groups:", err);
        res.status(500).send("Error fetching groups");
    }
});

// upload new group
app.post("/groups", async function(req, res) {
    var groupName = req.body.groupName;
    // check for group name
    if (!groupName){
        return res.status(400).send("Group name is required");
    }
    try {
        // make sure name isn't already in database
        var existingGroup = await groupModel.findOne({name: groupName});
        if (existingGroup) {
            var groups = await groupModel.find({});
            return res.render("pages/groups", {
                groups, 
                error: "Group name already exists"
            })
        }
        // upload group to database
        var newGroup = new groupModel({name: groupName});
        await newGroup.save();
        res.redirect("/groups");
    }
    catch (err) {
        console.error("Error creating group: ", err);
        res.status(500).send("Failed to create group");
    }
});



// Route to display all files
app.get('/file', async (req, res) => {

    // make sure gfs bucket is set up
    if (!gfs) 
        return res.status(503).send("Error: GridFS Bucket not set up");

    try {
        // show all files
        var allFiles = gfs.find({});
        var files = await allFiles.toArray();
        res.render("pages/file", { files });
    } catch (err) {
        console.error("Error fetching files:", err);
        res.status(500).send("Error fetching files");
    }
});

// route to upload new file
app.post("/file/upload", upload.single("uploadedFile"), (req, res) => {
    
    // check for file
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }

    // open upload stream
    const uploadStream = gfs.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype
    });
    uploadStream.end(req.file.buffer);

    // success
    uploadStream.on("finish", () => {
        console.log("File uploaded successfully!");
        res.redirect("/file"); // Redirect to file list page
    });

    // upload failure
    uploadStream.on("error", (err) => {
        console.log("Error uploading file:", err);
        res.status(500).send("Error uploading file");
    });
});



// route to download file
app.get('/file/:filename', async (req, res) => {

    // make sure gfs bucket is set up for file storage
    if (!gfs) 
        return res.status(503).send("Error: GridFS Bucket not set up");

    try {
        // get files 
        const files = await gfs.find({ filename: req.params.filename }).toArray();
        if (!files) {
            return res.status(404).send("File not found");
        }
        // download stream to download file
        res.set("Content-Type", files[0].contentType);
        const readStream = gfs.openDownloadStreamByName(req.params.filename);
        readStream.pipe(res);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Error downloading file");
    }
});

// handle server connections/chat
io.on("connection", function(socket){
  //console.log('a user connected');
  // emit chat message to all users
  socket.on("chat message", function(msg){
    io.emit("chat message", msg);
  });
});

// listen on port 3000
http.listen(3000, function(){
  console.log("listening on port 3000");
});