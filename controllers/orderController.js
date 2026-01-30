const Razorpay = require("razorpay");
const crypto = require("crypto");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Book = require("../models/Book");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ================= CREATE RAZORPAY ORDER ================= */
const createRazorpayOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.book");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    const amountInPaise = Math.round(cart.totalAmount * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: "rcpt_" + Date.now()
    };

    const rpOrder = await razorpay.orders.create(options);

    const orderItems = cart.items.map(item => {
      let dueDate;
      if (item.type === "rent" && item.duration) {
        const d = new Date();
        d.setDate(d.getDate() + item.duration);
        dueDate = d;
      }

      return {
        book: item.book._id,
        type: item.type,
        quantity: item.quantity,
        price: item.price,
        duration: item.duration,
        dueDate,
        safeAmount: item.safeAmount || 0
      };
    });

    const totalDeposit = cart.items
      .filter(i => i.type === "rent")
      .reduce((sum, i) => sum + (i.safeAmount || 0) * i.quantity, 0);

    /* ⭐ NEW — stored snapshot only if provided (non-breaking) */
    const shippingSnapshot = req.shippingSnapshot || null;

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount: cart.totalAmount,
      totalDeposit,
      razorpayOrderId: rpOrder.id,
      paymentStatus: "pending",
      shipping: shippingSnapshot // ⭐ added, no disruption
    });

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: "INR",
      razorpayOrderId: rpOrder.id,
      dbOrderId: order._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= VERIFY PAYMENT ================= */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, user: req.user.id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: "paid",
      },
      { new: true }
    ).populate("items.book");

    if (!order) return res.status(404).json({ message: "Order not found" });

    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [], totalAmount: 0 }
    );

    res.json({ message: "Payment verified and order placed", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET MY ORDERS ================= */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.book")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= CANCEL ORDER (USER) ================= */
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "Delivered") {
      return res.status(400).json({ message: "Delivered orders cannot be cancelled" });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Order already cancelled" });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= REFUND REQUEST (USER) ================= */
const requestRefund = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Only paid orders can be refunded" });
    }

    if (order.orderStatus !== "Cancelled") {
      return res.status(400).json({ message: "Cancel order before requesting refund" });
    }

    if (order.refund?.status === "pending") {
      return res.status(400).json({ message: "Refund already requested" });
    }

    order.refund.status = "pending";
    order.refund.reason = reason || "User requested refund";

    await order.save();

    res.json({ message: "Refund request submitted", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
  cancelOrder,
  requestRefund
};
