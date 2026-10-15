
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Note = require("../models/note.js");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Configure PDF storage
const uploadFolder = path.resolve(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Accept PDF files only
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" &&
      path.extname(file.originalname).toLowerCase() === ".pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// Upload a new note
router.post("/", authMiddleware, (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    const { title, description, subject, semester } = req.body;

    if (
      !title ||
      !subject ||
      !semester ||
      !Number.isInteger(Number(semester)) ||
      Number(semester) < 1 ||
      Number(semester) > 8 ||
      !req.file
    ) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }

      return res.status(400).json({
        message: "Enter a title, subject, valid semester (1-8), and PDF file",
      });
    }

    const note = new Note({
      title,
      description,
      subject,
      semester: Number(semester),
      filePath: req.file.path,
      uploadedBy: req.user.userId,
    });

    await note.save();

    res.status(201).json({
      message: "Note uploaded successfully",
      note,
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      message: "Error uploading note",
      error: error.message,
    });
  }
});

// Get all notes with optional filters
router.get("/", async (req, res) => {
  try {
    const { subject, semester } = req.query;
    const filter = {};

    if (subject) {
      filter.subject = { $regex: subject, $options: "i" };
    }

    if (semester) {
      const semesterNumber = Number(semester);

      if (
        !Number.isInteger(semesterNumber) ||
        semesterNumber < 1 ||
        semesterNumber > 8
      ) {
        return res.status(400).json({
          message: "Semester must be a number between 1 and 8",
        });
      }

      filter.semester = semesterNumber;
    }

    const notes = await Note.find(filter)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Notes fetched successfully",
      notes,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching notes",
      error: error.message,
    });
  }
});

// Download a note PDF
router.get("/:id/download", async (req, res) => {
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        message: "Invalid note ID",
      });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const filePath = path.resolve(note.filePath);
    const relativePath = path.relative(uploadFolder, filePath);

    if (
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath)
    ) {
      return res.status(400).json({
        message: "Invalid file path",
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "PDF file not found on the server",
      });
    }

    res.download(filePath, (error) => {
      if (error && !res.headersSent) {
        res.status(500).json({
          message: "Error downloading PDF",
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error downloading note",
    });
  }
});


 // Delete a note uploaded by the logged-in student
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        message: "Invalid note ID",
      });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    // Check whether the logged-in student owns the note
    if (note.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "You can delete only your own notes",
      });
    }

    // Delete the PDF if its path is inside the uploads folder
    const filePath = path.resolve(note.filePath);
    const relativePath = path.relative(uploadFolder, filePath);

    if (
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath) &&
      fs.existsSync(filePath)
    ) {
      fs.unlinkSync(filePath);
    }

    // Delete the note from MongoDB
    await Note.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Note and its PDF deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting note",
    });
  }
});


module.exports = router;
