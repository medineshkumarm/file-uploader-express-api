const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const cors = require("cors");
require("dotenv").config();

const app = express();

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Image Schema Definition
const imageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
  },
  imageUrl: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});
const Image = mongoose.model("Image", imageSchema);

// Multer Storage Configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to Upload and Optimize Image
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const compressedImageBuffer = await sharp(req.file.buffer)
      .resize(800)
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    const filename = `${Date.now()}-${req.file.originalname}`;
    const outputPath = path.join(__dirname, "uploads", filename);

    await sharp(compressedImageBuffer).toFile(outputPath);

    const newImage = new Image({
      title,
      description,
      imageUrl: `/uploads/${filename}`,
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error("Upload Error:", error.message);
    res.status(500).json({ error: "Image upload failed" });
  }
});

// Route to Get All Images
app.get("/images", async (req, res) => {
  try {
    const images = await Image.find(); // Fetch all images from the database

    if (!images.length) {
      return res.status(200).json([]); // Return empty array if no images found
    }

    const imageData = images.map((image) => ({
      id: image._id,
      title: image.title,
      description: image.description,
      imageUrl: image.imageUrl,
      uploadDate: image.uploadDate,
    }));

    res.status(200).json(imageData); // Send the images in the response
  } catch (error) {
    console.error("Fetch All Images Error:", error.message);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Route to Get an Image by ID and Serve the Image File
app.get("/images/:id", async (req, res) => {
  try {
    const imageId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: "Invalid image ID format" });
    }

    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    const imagePath = path.join(__dirname, image.imageUrl);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Image file not found" });
    }

    res.sendFile(imagePath);
  } catch (error) {
    console.error("Fetch Image Error:", error.message);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message || "Server Error",
  });
});

// Connect to MongoDB and Start Server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("DB connected");
    app.listen(PORT, () => {
      console.log(`Server running on PORT: ${PORT}...`);
    });
  })
  .catch((error) => {
    console.error("Error occurred during DB connection:", error);
  });
