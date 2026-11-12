const Category = require("../models/category.model");
const Transaction = require("../models/transaction.model");

async function list(req, res, next) {
  try {
    const categories = await Category.find({ userId: req.user.id }).sort({ type: 1, name: 1 });
    res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Type must be income or expense" });
    }

    const category = await Category.create({
      userId: req.user.id,
      name: name.trim(),
      type,
    });

    res.status(201).json({ category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You already have a category with that name and type" });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { name, type } = req.body;
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Category name is required" });
      category.name = name.trim();
    }
    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ message: "Type must be income or expense" });
      }
      category.type = type;
    }

    await category.save();
    res.status(200).json({ category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You already have a category with that name and type" });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const inUse = await Transaction.exists({ userId: req.user.id, categoryId: category._id });
    if (inUse) {
      return res.status(409).json({ message: "Category is used by existing transactions and cannot be deleted" });
    }

    await category.deleteOne();
    res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
