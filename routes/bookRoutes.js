const express = require("express");
const uploadCloud = require("../middleware/uploadCloudinary");
const {
  addBook,
  getBooks,
  getBook,
  updateBook,
  deleteBook,
  getTrendingBooks
} = require("../controllers/bookController");

const router = express.Router();

router.post("/add", uploadCloud.single("image"), addBook);
router.get("/", getBooks);
router.get("/trending", getTrendingBooks);
router.get("/:id", getBook);
router.put("/:id", uploadCloud.single("image"), updateBook);
router.delete("/:id", deleteBook);

module.exports = router;
