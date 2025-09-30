// server/server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const docRoutes = require("./routes/docRoutes");
const Document = require("./models/Document"); // Ensure file is named "Document.js" (capital D)

const app = express();
app.use(cors());
app.use(express.json());

// --- Health check route ---
app.get("/", (req, res) => {
  res.send("✅ API is running successfully!");
});

// --- REST routes ---
app.use("/api/docs", docRoutes);

// --- Create HTTP + Socket.IO server ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// --- Socket.IO handling ---
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // User joins a document
  socket.on("join-doc", async ({ docId, userName }) => {
    try {
      socket.join(docId);
      socket.data.userName = userName || "anonymous";

      let doc = await Document.findOne({ docId });
      if (!doc) {
        doc = new Document({ docId, content: "", version: 0 });
        await doc.save();
      }

      // Send initial document
      socket.emit("doc-load", { content: doc.content, version: doc.version });

      // Broadcast presence
      const clients = await io.in(docId).allSockets();
      io.in(docId).emit("presence", { count: clients.size });
    } catch (err) {
      console.error("❌ join-doc error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // Handle document changes
  socket.on("doc-change", async ({ docId, content, version: clientVersion }) => {
    try {
      const doc = await Document.findOne({ docId });

      if (!doc) {
        const newDoc = new Document({ docId, content, version: clientVersion + 1 });
        await newDoc.save();
        io.in(docId).emit("doc-update", { content: newDoc.content, version: newDoc.version });
        return;
      }

      if (clientVersion === doc.version) {
        doc.content = content;
        doc.version = doc.version + 1;
        doc.updatedAt = Date.now();
        await doc.save();

        io.in(docId).emit("doc-update", { content: doc.content, version: doc.version });
      } else {
        socket.emit("version-mismatch", { content: doc.content, version: doc.version });
      }
    } catch (err) {
      console.error("❌ doc-change error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // Handle disconnect
  socket.on("disconnecting", async () => {
    try {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      for (const room of rooms) {
        setTimeout(async () => {
          const clients = await io.in(room).allSockets();
          io.in(room).emit("presence", { count: clients.size });
        }, 50);
      }
    } catch (err) {
      console.error("❌ disconnecting error:", err);
    }
  });
});

// --- Server + Database ---
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collab-docs";

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Mongo connection error:", err);
  });
