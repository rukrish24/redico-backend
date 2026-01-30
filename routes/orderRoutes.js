const express = require("express");
const {
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
  cancelOrder,
  requestRefund
} = require("../controllers/orderController");

const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", auth, createRazorpayOrder);
router.post("/verify", auth, verifyPayment);
router.get("/my-orders", auth, getMyOrders);

router.put("/:id/cancel", auth, cancelOrder);
router.post("/:id/refund-request", auth, requestRefund);

module.exports = router;
