const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.use(requireAuth);

router.get("/", categoryController.list);
router.post("/", categoryController.create);
router.patch("/:id", categoryController.update);
router.delete("/:id", categoryController.remove);

module.exports = router;
