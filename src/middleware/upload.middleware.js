const multer = require("multer");

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Unsupported file type: " + file.mimetype));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

// Field name must match the form field used by the client: "attachments" (plural).
const uploadAttachments = upload.array("attachments", MAX_FILES);

// Wraps multer so its errors flow through the normal error-handling middleware
// instead of crashing the request with an unformatted stack trace.
function handleUpload(req, res, next) {
  uploadAttachments(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}

module.exports = { handleUpload, MAX_FILES, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };
