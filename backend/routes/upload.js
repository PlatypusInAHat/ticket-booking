const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');

const router = express.Router();

router.post('/image', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
  upload.single('image')
], (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không tìm thấy file ảnh' });
  }
  
  res.status(200).json({
    message: 'Tải ảnh thành công',
    url: req.file.path // Cloudinary URL
  });
});

module.exports = router;
