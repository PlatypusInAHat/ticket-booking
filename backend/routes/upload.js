const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { upload, uploadImageToCloudinary } = require('../utils/cloudinary');

const router = express.Router();

router.post('/image', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
], (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds the 5MB limit.' });
      }
      return res.status(400).json({ error: err.message || 'Image upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    uploadImageToCloudinary(req, res, (uploadErr) => {
      if (uploadErr) {
        return next(uploadErr);
      }

      res.status(200).json({
        message: 'Image uploaded successfully',
        url: req.file.path,
        publicId: req.file.filename,
      });
    });
  });
});

module.exports = router;
