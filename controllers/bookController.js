const mongoose = require("mongoose");
const Book = require("../models/Book");
const Order = require("../models/Order");
const fs = require("fs");
const path = require("path");

/* === ADD BOOK === */
exports.addBook = async (req, res) => {
  try {
    const data = { ...req.body };

    // If uploaded using Cloudinary (req.file.path exists)
    if (req.file && req.file.path) {
      data.image = req.file.path; // Cloudinary URL
    }

    // (Fallback) still allow disk-based uploads
    else if (req.file && req.file.filename) {
      data.image = `/uploads/books/${req.file.filename}`;
    }

    const book = await Book.create(data);
    res.status(201).json({ message: "Book added successfully", book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===== GET ALL BOOKS (WITH SEARCH) ===== */
exports.getBooks = async (req, res) => {
  try {
    const { q } = req.query;
    let filter = {};

    if (q && q.trim()) {
      const keyword = q.trim();
      filter = {
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { author: { $regex: keyword, $options: "i" } }
        ]
      };
    }

    const books = await Book.find(filter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===== GET SINGLE BOOK ===== */
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate("category", "name");

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===== UPDATE BOOK ===== */
exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const data = { ...req.body };

    // Cloudinary upload case
    if (req.file && req.file.path) {
      data.image = req.file.path;
    }

    // fallback - local disk upload
    else if (req.file && req.file.filename) {
      if (book.image && book.image.startsWith("/uploads")) {
        const oldPath = path.join(__dirname, "..", book.image);
        fs.existsSync(oldPath) && fs.unlinkSync(oldPath);
      }
      data.image = `/uploads/books/${req.file.filename}`;
    }

    const updated = await Book.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    res.json({ message: "Book updated", updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===== DELETE BOOK ===== */
exports.deleteBook = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid Book ID" });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // delete local file only (DO NOT delete Cloudinary URLs)
    if (book.image && book.image.startsWith("/uploads")) {
      const imgPath = path.join(__dirname, "..", book.image);
      fs.existsSync(imgPath) && fs.unlinkSync(imgPath);
    }

    await book.deleteOne();
    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===== GET TRENDING BOOKS ===== */
exports.getTrendingBooks = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8;

    const trending = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.type": "purchase" } },
      {
        $group: {
          _id: "$items.book",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ]);

    const bookIds = trending.map(t => t._id);

    const books = await Book.find({ _id: { $in: bookIds } })
      .populate("category", "name")
      .lean();

    const orderedBooks = bookIds.map(id =>
      books.find(b => b._id.toString() === id.toString())
    );

    res.json(orderedBooks);
  } catch (error) {
    console.error("Trending books error:", error);
    res.status(500).json({ message: "Failed to fetch trending books" });
  }
};
