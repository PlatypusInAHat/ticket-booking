const express = require('express');
const { authenticateToken, authorizeRole } = require('../../../../middleware/auth');
const { mediaStorage } = require('@ticket-booking/platform');
const { upload, uploadImage } = mediaStorage;

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
      return res.status(400).json({ error: 'No image file was provided.' });
    }

    uploadImage(req.file)
      .then((result) => {
        res.status(200).json({
          message: 'Image uploaded successfully',
          url: result.url,
          publicId: result.publicId,
          provider: result.provider
        });
      })
      .catch((uploadErr) => next(uploadErr));
  });
});

module.exports = router;
