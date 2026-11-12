const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Transaction = require("../models/transaction.model");
const Category = require("../models/category.model");
const { requireAuthPage, attachUserIfPresent } = require("../middleware/auth.middleware");

const PAGE_SIZE = 10;

router.get("/", attachUserIfPresent, (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.redirect("/login");
});

router.get("/register", attachUserIfPresent, (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("auth/register", { title: "Register" });
});

router.get("/login", attachUserIfPresent, (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("auth/login", { title: "Login" });
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

router.get("/dashboard", requireAuthPage, async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [totalsByType, recentTransactions] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
      Transaction.find({ userId }).populate("categoryId", "name type").sort({ date: -1, createdAt: -1 }).limit(5),
    ]);

    let income = 0;
    let expense = 0;
    totalsByType.forEach((row) => {
      if (row._id === "income") income = row.total;
      if (row._id === "expense") expense = row.total;
    });

    res.render("dashboard/index", {
      title: "Dashboard",
      summary: { income, expense, balance: Math.round((income - expense) * 100) / 100 },
      recentTransactions,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/transactions", requireAuthPage, async (req, res, next) => {
  try {
    const { type, category, from, to, page = 1 } = req.query;
    const filter = { userId: req.user.id };

    if (type && ["income", "expense"].includes(type)) filter.type = type;
    if (category && mongoose.Types.ObjectId.isValid(category)) filter.categoryId = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    const [transactions, total, categories] = await Promise.all([
      Transaction.find(filter)
        .populate("categoryId", "name type")
        .sort({ date: -1, createdAt: -1 })
        .skip((pageNum - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Transaction.countDocuments(filter),
      Category.find({ userId: req.user.id }).sort({ name: 1 }),
    ]);

    res.render("dashboard/transactions", {
      title: "Transactions",
      transactions,
      categories,
      filters: { type: type || "", category: category || "", from: from || "", to: to || "" },
      pagination: {
        page: pageNum,
        totalPages: Math.ceil(total / PAGE_SIZE) || 1,
        total,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/transactions/add", requireAuthPage, async (req, res, next) => {
  try {
    const categories = await Category.find({ userId: req.user.id }).sort({ name: 1 });
    res.render("dashboard/add-transaction", { title: "Add Transaction", categories });
  } catch (err) {
    next(err);
  }
});

router.get("/transactions/:id/edit", requireAuthPage, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render("error", { title: "Not Found", message: "Transaction not found", status: 404 });
    }
    const [transaction, categories] = await Promise.all([
      Transaction.findOne({ _id: req.params.id, userId: req.user.id }),
      Category.find({ userId: req.user.id }).sort({ name: 1 }),
    ]);
    if (!transaction) {
      return res.status(404).render("error", { title: "Not Found", message: "Transaction not found", status: 404 });
    }
    res.render("dashboard/edit-transaction", { title: "Edit Transaction", transaction, categories });
  } catch (err) {
    next(err);
  }
});

router.get("/transactions/:id", requireAuthPage, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render("error", { title: "Not Found", message: "Transaction not found", status: 404 });
    }
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id }).populate(
      "categoryId",
      "name type"
    );
    if (!transaction) {
      return res.status(404).render("error", { title: "Not Found", message: "Transaction not found", status: 404 });
    }
    res.render("dashboard/transaction-detail", { title: "Transaction Details", transaction });
  } catch (err) {
    next(err);
  }
});

router.get("/categories", requireAuthPage, async (req, res, next) => {
  try {
    const categories = await Category.find({ userId: req.user.id }).sort({ type: 1, name: 1 });
    res.render("dashboard/categories", { title: "Categories", categories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
