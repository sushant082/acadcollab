var express = require('express');
var mongoose = require('mongoose');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const {MongoClient, GridFSBucket} = require('mongodb')
var multer = require('multer');
var path = require("path")
var mongoose = require('mongoose');

// connect to mongoose
const mongoURI = 'mongodb://localhost:27017/mydatabase'
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const conn = mongoose.connection;

// set up gfs for file storage
let gfs;
conn.once('open', () => {
    console.log("MongoDB connection open");
    // Initialize GridFSBucket
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
});
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

// Route to display all files
app.get('/file', async (req, res) => {
    if (!gfs) return res.status(503).send('GridFS not initialized');

    try {
        const filesCursor = gfs.find({});
        const files = await filesCursor.toArray();
        res.render('pages/file', { files });
    } catch (err) {
        console.error('Error fetching files:', err);
        res.status(500).send('Error fetching files');
    }
});

// route to upload new file
app.post('/file/upload', upload.single('uploadedFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const uploadStream = gfs.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
        console.log('File uploaded successfully!');
        res.redirect('/file'); // Redirect to file list page
    });

    uploadStream.on('error', (err) => {
        console.log('Error uploading file:', err);
        res.status(500).send('Error uploading file');
    });
});



// route to download file
app.get('/file/:filename', async (req, res) => {
    if (!gfs) return res.status(503).send('GridFS not initialized');

    try {
        const files = await gfs.find({ filename: req.params.filename }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).send('File not found');
        }

        res.set('Content-Type', files[0].contentType);
        const readStream = gfs.openDownloadStreamByName(req.params.filename);
        readStream.pipe(res);
    } catch (err) {
        console.error('Error streaming file:', err);
        res.status(500).send('Error streaming file');
    }
});

// handle server connections/chat
io.on('connection', function(socket){
  //console.log('a user connected');
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

// listen on port 3000
http.listen(3000, function(){
  console.log('listening on port 3000');
});