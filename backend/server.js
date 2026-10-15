const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const noteRoutes = require("./routes/noteRoutes");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/notes", noteRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NoteNest backend is running",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

app.use("/api/auth", authRoutes);

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication verified",
    userId: req.user.userId,
  });
});



startServer();