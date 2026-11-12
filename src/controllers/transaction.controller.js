const mongoose = require("mongoose");
const Transaction = require("../models/transaction.model");
const Category = require("../models/category.model");
const { uploadManyToCloudinary, deleteFromCloudinary } = require("../utils/cloudinaryUpload");

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 50;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function validateCategoryOwnership(categoryId, userId, type) {
  if (!categoryId) return null;
  if (!isValidObjectId(categoryId)) {
    const err = new Error("Invalid category");
    err.status = 400;
    throw err;
  }
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) {
    const err = new Error("Category not found or not owned by user");
    err.status = 400;
    throw err;
  }
  if (type && category.type !== type) {
    const err = new Error("Category type does not match transaction type");
    err.status = 400;
    throw err;
  }
  return category;
}

function parseAmount(raw) {
  const amount = Number(raw);
  if (Number.isNaN(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function parseDate(raw) {
  if (!raw) return new Date();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function create(req, res, next) {
  try {
    const { title, amount, type, date, notes, categoryId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Type must be income or expense" });
    }
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    const parsedDate = parseDate(date);
    if (parsedDate === null) {
      return res.status(400).json({ message: "Invalid date" });
    }

    await validateCategoryOwnership(categoryId, req.user.id, type);

    let attachments = [];
    if (req.files && req.files.length > 0) {
      const folder = `expense-tracker/${req.user.id}`;
      attachments = await uploadManyToCloudinary(req.files, folder);
    }

    const transaction = await Transaction.create({
      userId: req.user.id,
      categoryId: categoryId || null,
      title: title.trim(),
      amount: parsedAmount,
      type,
      date: parsedDate,
      notes: notes ? notes.trim() : "",
      attachments,
    });

    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { type, category, from, to, page = 1, limit = PAGE_SIZE_DEFAULT } = req.query;

    const filter = { userId: req.user.id };

    if (type && ["income", "expense"].includes(type)) {
      filter.type = type;
    }
    if (category && isValidObjectId(category)) {
      filter.categoryId = category;
    }
    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = parseDate(from);
        if (fromDate) filter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = parseDate(to);
        if (toDate) filter.date.$lte = toDate;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(limit, 10) || PAGE_SIZE_DEFAULT));

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("categoryId", "name type")
        .sort({ date: -1, createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      transactions,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    const { from, to, groupBy } = req.query;

    const match = { userId: new mongoose.Types.ObjectId(req.user.id) };
    if (from || to) {
      match.date = {};
      if (from) {
        const fromDate = parseDate(from);
        if (fromDate) match.date.$gte = fromDate;
      }
      if (to) {
        const toDate = parseDate(to);
        if (toDate) match.date.$lte = toDate;
      }
    }

    const totalsByType = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    let income = 0;
    let expense = 0;
    totalsByType.forEach((row) => {
      if (row._id === "income") income = row.total;
      if (row._id === "expense") expense = row.total;
    });

    const result = {
      income,
      expense,
      balance: Math.round((income - expense) * 100) / 100,
    };

    if (groupBy === "category") {
      result.byCategory = await Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { categoryId: "$categoryId", type: "$type" },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id.categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $project: {
            _id: 0,
            categoryId: "$_id.categoryId",
            type: "$_id.type",
            total: 1,
            count: 1,
            categoryName: { $arrayElemAt: ["$category.name", 0] },
          },
        },
        { $sort: { total: -1 } },
      ]);
    }

    if (groupBy === "month") {
      result.byMonth = await Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { month: { $dateToString: { format: "%Y-%m", date: "$date" } }, type: "$type" },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]);
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id }).populate(
      "categoryId",
      "name type"
    );
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.status(200).json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const { title, amount, type, date, notes, categoryId } = req.body;
    const nextType = type !== undefined ? type : transaction.type;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: "Title is required" });
      transaction.title = title.trim();
    }
    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ message: "Type must be income or expense" });
      }
      transaction.type = type;
    }
    if (amount !== undefined) {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount === null) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      transaction.amount = parsedAmount;
    }
    if (date !== undefined) {
      const parsedDate = parseDate(date);
      if (parsedDate === null) return res.status(400).json({ message: "Invalid date" });
      transaction.date = parsedDate;
    }
    if (notes !== undefined) {
      transaction.notes = notes.trim();
    }
    if (categoryId !== undefined) {
      if (categoryId === "" || categoryId === null) {
        transaction.categoryId = null;
      } else {
        await validateCategoryOwnership(categoryId, req.user.id, nextType);
        transaction.categoryId = categoryId;
      }
    }

    if (req.files && req.files.length > 0) {
      const folder = `expense-tracker/${req.user.id}`;
      const uploaded = await uploadManyToCloudinary(req.files, folder);
      transaction.attachments.push(...uploaded);
    }

    await transaction.save();
    res.status(200).json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function removeAttachment(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const attachment = transaction.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    await deleteFromCloudinary(attachment.publicId, attachment.resourceType);
    attachment.deleteOne();
    await transaction.save();

    res.status(200).json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await Promise.allSettled(
      transaction.attachments.map((a) => deleteFromCloudinary(a.publicId, a.resourceType))
    );

    await transaction.deleteOne();
    res.status(200).json({ message: "Transaction deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, summary, getById, update, removeAttachment, remove };
