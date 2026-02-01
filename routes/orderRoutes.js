const express = require("express");
const {
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
  cancelOrder,
  requestRefund,
  createFinePaymentOrder,   
  verifyFinePayment  
} = require("../controllers/orderController");

const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", auth, (req, res, next) => {
  req.shippingSnapshot = req.body?.shipping || null; // ⭐ NEW (does not break existing)
  createRazorpayOrder(req, res, next);
});
router.post("/verify", auth, verifyPayment);
router.get("/my-orders", auth, getMyOrders);

router.post("/fine/create", auth, createFinePaymentOrder);
router.post("/fine/verify", auth, verifyFinePayment);

router.put("/:id/cancel", auth, cancelOrder);
router.post("/:id/refund-request", auth, requestRefund);

module.exports = router;
