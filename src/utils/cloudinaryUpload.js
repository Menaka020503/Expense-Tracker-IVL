const cloudinary = require("../config/cloudinary");

function resourceTypeFor(mimetype) {
  if (mimetype.startsWith("image/")) return "image";
  return "raw";
}

// Streams a buffer (from multer memory storage) straight to Cloudinary, no temp files on disk.
function uploadBufferToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const resourceType = resourceTypeFor(file.mimetype);
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          resourceType: result.resource_type,
          format: result.format,
          originalName: file.originalname,
          bytes: result.bytes,
        });
      }
    );
    stream.end(file.buffer);
  });
}

async function uploadManyToCloudinary(files, folder) {
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file, folder);
      uploaded.push(result);
    }
    return uploaded;
  } catch (err) {
    // Clean up anything already uploaded before this one failed.
    await Promise.allSettled(
      uploaded.map((asset) => deleteFromCloudinary(asset.publicId, asset.resourceType))
    );
    throw err;
  }
}

async function deleteFromCloudinary(publicId, resourceType) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || "image" });
  } catch (err) {
    console.error("Failed to delete Cloudinary asset", publicId, err.message);
  }
}

module.exports = { uploadBufferToCloudinary, uploadManyToCloudinary, deleteFromCloudinary };
