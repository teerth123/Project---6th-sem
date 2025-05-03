// --- uploadRoute.js ---
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Multer configuration (can be adjusted as needed)
console.log("backend here");
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + fileExtension);
  },
});

const upload = multer({ storage: storage });

// POST /api/upload
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto", // Cloudinary will automatically determine the type
    });

    // Clean up the temporary file created by multer
    fs.unlinkSync(req.file.path);

    res.json({ url: result.secure_url, type: result.resource_type });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Error uploading file.' });
  }
});

export default router;