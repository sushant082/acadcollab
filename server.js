var express = require('express');
var mongoose = require('mongoose');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var session = require("express-session");
var multer = require('multer');
var path = require("path");

// connect to mongoose
async function main() {
    await mongoose.connect('mongodb://localhost:27017/testDatabase');
}
main().then(() => console.log("Connected to mongoDB")).catch(error => console.log("Something went wrong: " + error));
const conn = mongoose.connection;

// set up models
var fileModel = require("./models/fileModel"); // NEED TO IMPLEMENT
var groupModel = require("./models/groupModel");
var userModel = require("./models/userModel");

// set up gfs for file storage
let gfs;
conn.once('open', () => {
    console.log("MongoDB connection open");
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
});

// multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

// home route
app.get("/", function (req, res) {
    if (req.session.user) {
        res.render("pages/home");
    } else {
        res.render("pages/index", { error: null });
    }
});

// login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.render("pages/index", { error: "All fields are required" });
    }

    try {
        const user = await userModel.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.render("pages/index", { error: "Invalid username or password" });
        }

        req.session.user = { username: user.username };
        res.redirect("/home");
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send("Internal server error");
    }
});

// signup
app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.render("pages/index", { error: "All fields are required" });
    }

    try {
        const existing = await userModel.findOne({ username });
        if (existing) {
            return res.render("pages/index", { error: "Username already exists" });
        }

        const user = new userModel({ username, password });
        await user.save();

        req.session.user = { username: user.username };
        res.redirect("/chat");
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).send("Internal server error");
    }
});

// home
app.get("/home", function (req, res) {
    res.render("pages/home");
});

// profile
app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/');
  
    // If you need extra user info from DB (like createdAt):
    userModel.findOne({ username: req.session.user.username })
      .then(user => {
        if (!user) return res.redirect('/');
        res.render('pages/profile', { user });
      })
      .catch(err => {
        console.error("Error loading profile:", err);
        res.status(500).send("Error loading profile");
      });
  });
  

// logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// chat
app.get("/chat", function (req, res) {
    if (!req.session.user) return res.redirect("/");
    res.render("pages/chat");
});

// groups

app.get("/groups", async function (req, res) {
    try {
        const groups = await groupModel.find({});
        const users = await userModel.find({}, "username");
        const user = req.session.user;

        let selectedGroup = null;
        if (req.query.groupId) {
            selectedGroup = await groupModel.findById(req.query.groupId);
        }

        res.render("pages/groups", {
            groups,
            users,
            user,
            selectedGroup,
            error: null
        });
    } catch (err) {
        console.error("Error fetching groups:", err);
        res.status(500).send("Error fetching groups");
    }
});




app.post("/groups", async function (req, res) {
    const groupName = req.body.groupName;
    const username = req.session.user?.username;

    if (!groupName || !username) {
        return res.status(400).send("Group name and user required");
    }

    try {
        const existingGroup = await groupModel.findOne({ name: groupName });
        if (existingGroup) {
            const groups = await groupModel.find({});
            res.render("pages/groups", {
                groups,
                users,
                error: null,
                user: req.session.user  // ✅ Explicitly pass user
            });
            
        }

        const newGroup = new groupModel({
            name: groupName,
            owner: username,
            members: [username] // owner is first member
        });

        await newGroup.save();
        res.redirect("/groups");
    } catch (err) {
        console.error("Error creating group: ", err);
        res.status(500).send("Failed to create group");
    }
});

// documents (not the file editor)
app.get('/documents', async (req, res) => {
    try {
        const documents = await fileModel.find({});
        const groups = await groupModel.find({});
        res.render('pages/documents', { documents, groups });
    } catch (err) {
        console.error("Error fetching documents:", err);
        res.status(500).send("Error loading documents");
    }
});


  
  app.post('/file/:id/delete', async (req, res) => {
    await fileModel.findByIdAndDelete(req.params.id);
    res.redirect('/documents');
  });
  
  app.post('/file/:id/assign-group', async (req, res) => {
    const { groupId } = req.body;
    // Assign group to file — depends on schema support
    console.log(`Assigning file ${req.params.id} to group ${groupId}`);
    res.redirect('/documents');
  });
  


// files
app.get('/file', async (req, res) => {
    try {
        const files = await fileModel.find({});  // ✅ This is the correct source
        const groups = await groupModel.find({});

        res.render("pages/file", {
            files,
            groups,
            user: req.session.user || null
        });
    } catch (err) {
        console.error("Error fetching files or groups:", err);
        res.status(500).send("Error fetching files or groups");
    }
});



app.post("/file/upload", upload.single("uploadedFile"), (req, res) => {
    if (!req.file || !req.session.user?.username) {
      return res.status(400).send("Missing file or user session");
    }
  
    const safeFilename = `${Date.now()}-${req.file.originalname}`; // avoid collisions
    const uploadStream = gfs.openUploadStream(safeFilename, {
      contentType: req.file.mimetype
    });
  
    uploadStream.write(req.file.buffer);
    uploadStream.end();
  
    uploadStream.on("finish", async () => {
      try {
        const fileEntry = new fileModel({
          originalName: req.file.originalname,
          storedName: safeFilename,
          path: `/preview/${safeFilename}`,
          owner: req.session.user.username
        });
  
        await fileEntry.save();
        console.log("✅ File metadata saved to fileModel");
        res.redirect("/documents");
      } catch (err) {
        console.error("❌ Error saving file metadata:", err);
        res.status(500).send("Upload succeeded but metadata failed to save.");
      }
    });
  
    uploadStream.on("error", (err) => {
      console.error("❌ Error uploading file to GridFS:", err);
      res.status(500).send("GridFS upload failed.");
    });
  });
  


app.post("/groups/:id/remove-member", async function (req, res) {
    const groupId = req.params.id;
    const username = req.session.user?.username;
    const memberToRemove = req.body.memberUsername;

    try {
        const group = await groupModel.findById(groupId);
        if (!group || group.owner !== username) {
            return res.status(403).send("Unauthorized");
        }

        group.members = group.members.filter(m => m !== memberToRemove);
        await group.save();

        res.redirect("/groups");
    } catch (err) {
        console.error("Error removing member:", err);
        res.status(500).send("Internal server error");
    }
});

const bcrypt = require("bcrypt"); // already required in userModel.js

const { ObjectId } = require('mongodb');

app.post('/file/:id/delete', async (req, res) => {
    const fileId = req.params.id;
    const username = req.session.user?.username;

    if (!username) return res.status(401).send("Unauthorized");

    try {
        const fileEntry = await fileModel.findById(fileId);
        if (!fileEntry) return res.status(404).send("File not found");
        if (fileEntry.owner !== username) return res.status(403).send("Forbidden");

        await fileModel.findByIdAndDelete(fileId);

        const files = await gfs.find({ filename: fileEntry.storedName }).toArray();
        if (files.length > 0) {
            await gfs.delete(files[0]._id);
            console.log("Deleted from GridFS:", fileEntry.storedName);
        }

        res.redirect('/documents');
    } catch (err) {
        console.error("Error deleting file:", err);
        res.status(500).send("Error deleting file");
    }
});


app.post("/groups/:id/delete", async (req, res) => {
    const groupId = req.params.id;
    const username = req.session.user?.username;
    const { password } = req.body;

    try {
        // Verify user identity
        const user = await userModel.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(403).send("Invalid password or unauthorized");
        }

        const group = await groupModel.findById(groupId);
        if (!group || group.owner !== username) {
            return res.status(403).send("You are not authorized to delete this group");
        }

        await groupModel.findByIdAndDelete(groupId);
        res.redirect("/groups");
    } catch (err) {
        console.error("Error deleting group:", err);
        res.status(500).send("Failed to delete group");
    }
});


app.post("/groups/:id/add-member", async function (req, res) {
    const groupId = req.params.id;
    const username = req.session.user?.username;
    const memberToAdd = req.body.memberUsername;

    try {
        const group = await groupModel.findById(groupId);

        if (!group) return res.status(404).send("Group not found");
        if (group.owner !== username) return res.status(403).send("Unauthorized");

        if (!group.members.includes(memberToAdd)) {
            group.members.push(memberToAdd);
            await group.save();
        }

        res.redirect("/groups");
    } catch (err) {
        console.error("Error adding member:", err);
        res.status(500).send("Failed to add member");
    }
});

//Updates metadata of an existing file
//Modified by: Hunter Meesenburg
//Modified on: 4/30/2025 
app.post("/file/update-metadata", async (req, res) => {
    const { fileId, author, modDate } = req.body;

    if (!fileId) {
        return res.status(400).send("Missing fileId");
    }

    try{
        // Build the metadata update object
        const updateField = {};
        if (author) updateField["metadata.author"] = author;
        if (modDate) updateField["metadata.modifiedAt"] = new Date(modDate);

        // Updates the metadata using update object
        const result = await db.collection("fs.files").updateOne(
            { _id: new ObjectId(fileId) },
            { $set: updateField }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).send("File not found");
        }

        res.status(200).send("Metadata updated successfully");
    } catch (err) {
        console.error("Error updating metadata:", err);
        res.status(500).send("Error updating metadata");
    }
});

app.get('/preview/:filename', async (req, res) => {
    if (!gfs) return res.status(503).send("GridFS not initialized");

    try {
        const files = await gfs.find({ filename: req.params.filename }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).send("File not found");
        }

        const file = files[0];

        // Set appropriate content type for preview
        const contentType = file.contentType || 'application/octet-stream';
        res.set('Content-Type', contentType);

        // Stream file to browser
        const readStream = gfs.openDownloadStreamByName(req.params.filename);
        readStream.pipe(res);
    } catch (err) {
        console.error("Preview error:", err);
        res.status(500).send("Error previewing file");
    }
});


// socket.io chat
io.on("connection", function (socket) {
    socket.on("chat message", function (msg) {
        io.emit("chat message", msg);
    });
});

// start server
http.listen(3000, function () {
    console.log("listening on port 3000");
});
