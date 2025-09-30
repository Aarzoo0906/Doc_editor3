// server/routes/docRoutes.js
const express = require("express");
const router = express.Router();
const Document = require("../models/Document");

// GET all documents
router.get("/", async (req, res) => {
  try {
    const docs = await Document.find();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
