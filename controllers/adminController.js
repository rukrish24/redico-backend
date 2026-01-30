
const Order = require("../models/Order");
const Book = require("../models/Book");

// admin/dashboard

exports.getDashboardStats = async (req, res) => {
  try {
    // A) total orders (all)
    const totalOrders = await Order.countDocuments();

    // B) processing orders (existing metric untouched)
    const processingOrders = await Order.countDocuments({ orderStatus: "Processing" });

    // C) revenue calculation (NEW)
    const deliveredOrders = await Order.find({
      paymentStatus: "paid",      // paid only
      orderStatus: "Delivered",   // delivered only
      "refund.status": { $ne: "approved" } // refunded excluded
    });

    let revenue = 0;
    let totalSold = 0;

    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.type === "purchase") {
          totalSold += item.quantity;
          revenue += item.price * item.quantity; // purchase revenue
        } else if (item.type === "rent") {
          // rental revenue = rental price + fine (deposit excluded)
          revenue += item.price * item.quantity;
          if (item.fineAmount > 0) {
            revenue += item.fineAmount;
          }
        }
      });
    });

    // D) overdue (existing stays same)
    const overdueCount = await Order.countDocuments({
      "items.type": "rent",
      "items.returned": false,
      "items.dueDate": { $lt: new Date() }
    });

    res.json({
      totalOrders,
      processingOrders,
      revenue,
      overdueCount,
      totalSold // ★ NEW SENT TO FRONTEND
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//  /admin/orders

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const query = {};
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("items.book")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    res.json({ total, page: Number(page), limit: Number(limit), orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//  admin/orders/:id

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.book")
      .populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//  admin/orders/:id/status

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    ).populate("items.book");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//  admin/orders/:id/refund


exports.processRefund = async (req, res) => {
  try {
    const { refundAction, refundAmount, reason } = req.body;
    const order = await Order.findById(req.params.id).populate("items.book");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ensure refund object exists
    order.refund = order.refund || {};
    const now = new Date();

    if (refundAction === "approve") {
      const amount = typeof refundAmount === "number" ? refundAmount : order.totalAmount;

      order.refund.status = "approved";
      order.refund.refundDate = now;
      order.refund.refundAmount = amount;
      order.refund.reason = reason || "";

      order.paymentStatus = "refunded";

      // adjust stocks:
      const ops = [];
      for (const item of order.items) {
        const bookId = item.book._id ? item.book._id : item.book;
        if (item.type === "purchase") {

          ops.push(Book.findByIdAndUpdate(bookId, { $inc: { stock: item.quantity } }));
        } else if (item.type === "rent") {

          if (!item.returned) {
            ops.push(Book.findByIdAndUpdate(bookId, { $inc: { rentalStock: item.quantity } }));
          }
        }
      }
      await Promise.all(ops);

    } else if (refundAction === "decline") {
      order.refund.status = "declined";
      order.refund.refundDate = now;
      order.refund.refundAmount = 0;
      order.refund.reason = reason || "";
    } else {
      return res.status(400).json({ message: "Invalid refundAction. Use 'approve' or 'decline'." });
    }

    await order.save();
    res.json({ message: `Refund ${order.refund.status}`, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
