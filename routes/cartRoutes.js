const express = require("express");
const { addToCart, getCart, removeItem, updateQuantity, updateDuration } = require("../controllers/cartController");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/add", auth, addToCart);
router.get("/", auth, getCart);
router.delete("/:itemId", auth, removeItem);
router.put("/:itemId", auth, updateQuantity);
router.put("/:itemId/duration", auth, updateDuration);



module.exports = router;
