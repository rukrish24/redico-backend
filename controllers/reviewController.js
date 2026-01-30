const Review = require("../models/Review");
const Book = require("../models/Book");
const Order = require("../models/Order");

/* ================= ADD REVIEW (USER) ================= */
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookId = req.params.bookId;
    const userId = req.user.id;

    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment required" });
    }

    /* ===== CHECK PURCHASE ===== */
    const purchased = await Order.findOne({
      user: userId,
      "items.book": bookId,
      paymentStatus: "paid",
    });

    if (!purchased) {
      return res
        .status(403)
        .json({ message: "Purchase required to review this book" });
    }

    /* ===== CREATE REVIEW (UNIQUE INDEX PREVENTS DUPLICATE) ===== */
    const review = await Review.create({
      user: userId,
      book: bookId,
      rating,
      comment,
    });

    /* ===== RECALCULATE BOOK RATINGS ===== */
    const reviews = await Review.find({ book: bookId });

    const avg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await Book.findByIdAndUpdate(bookId, {
      averageRating: Number(avg.toFixed(1)),
      numReviews: reviews.length,
    });

    res.status(201).json({
      message: "Review added successfully",
      review,
    });
  } catch (err) {
    /* ===== DUPLICATE REVIEW ===== */
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "You already reviewed this book" });
    }

    res.status(500).json({ message: err.message });
  }
};

/* ================= GET REVIEWS FOR A BOOK ================= */
exports.getBookReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ book: req.params.bookId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= ADMIN: GET ALL REVIEWS ================= */
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate("book", "title")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= ADMIN: DELETE REVIEW ================= */
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const bookId = review.book;

    await review.deleteOne();

    /* ===== RECALCULATE BOOK RATINGS ===== */
    const reviews = await Review.find({ book: bookId });

    const avg =
      reviews.length === 0
        ? 0
        : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    await Book.findByIdAndUpdate(bookId, {
      averageRating: reviews.length ? Number(avg.toFixed(1)) : 0,
      numReviews: reviews.length,
    });

    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
