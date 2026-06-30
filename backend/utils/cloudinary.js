const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
      return;
    }

    cb(null, true);
  }
});

const uploadImageToCloudinary = (req, res, next) => {
  if (!req.file) {
    next();
    return;
  }

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'ticket_booking',
      resource_type: 'image'
    },
    (error, result) => {
      if (error) {
        next(error);
        return;
      }

      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      next();
    }
  );

  stream.end(req.file.buffer);
};

module.exports = {
  cloudinary,
  upload,
  uploadImageToCloudinary
};
