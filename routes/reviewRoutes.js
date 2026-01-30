const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
  addReview,
  getBookReviews,
  getAllReviews,
  deleteReview
} = require("../controllers/reviewController");

const router = express.Router();


router.post("/:bookId", auth, addReview);
router.get("/:bookId", getBookReviews);

router.get("/admin/all", auth, admin, getAllReviews);
router.delete("/admin/:id", auth, admin, deleteReview);

module.exports = router;
