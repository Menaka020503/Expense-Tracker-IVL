const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { handleUpload } = require("../middleware/upload.middleware");

router.use(requireAuth);

router.get("/summary", transactionController.summary);
router.get("/", transactionController.list);
router.post("/", handleUpload, transactionController.create);
router.get("/:id", transactionController.getById);
router.patch("/:id", handleUpload, transactionController.update);
router.delete("/:id/attachments/:attachmentId", transactionController.removeAttachment);
router.delete("/:id", transactionController.remove);

module.exports = router;
