// backend/controllers/rentalController.js
const Order = require("../models/Order");
const Book = require("../models/Book");

/**
 * POST /api/admin/rentals/return/:orderId/:itemId
 * Body optional: { finePerDay: 20 }
 */
// backend/controllers/rentalController.js

exports.returnRental = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const finePerDay = Number(req.body.finePerDay || req.query.finePerDay) || 20;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Order item not found" });
    if (item.type !== "rent") return res.status(400).json({ message: "Not a rental item" });
    if (item.returned) return res.status(400).json({ message: "Already returned" });

    /* ================= MARK RETURNED ================= */
    item.returned = true;
    item.returnDate = new Date();

    /* ================= OVERDUE CALC ================= */
    let overdueDays = 0;
    if (item.dueDate && new Date() > item.dueDate) {
      const diffMs = Date.now() - new Date(item.dueDate).getTime();
      overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
    item.overdueDays = overdueDays;

    /* ================= FINE ================= */
    item.fineAmount = overdueDays > 0 ? overdueDays * finePerDay : 0;

    /* ================= DEPOSIT SETTLEMENT ================= */
    const totalDeposit = (item.safeAmount || 0) * item.quantity;

    item.depositDeducted = Math.min(item.fineAmount, totalDeposit);
    item.depositRefund = Math.max(totalDeposit - item.depositDeducted, 0);

    /* ================= RESTOCK ================= */
    await Book.findByIdAndUpdate(item.book, {
      $inc: { rentalStock: item.quantity }
    });

    await order.save();

    res.json({
      message: "Rental returned successfully",
      item: {
        returned: item.returned,
        overdueDays: item.overdueDays,
        fineAmount: item.fineAmount,
        depositRefund: item.depositRefund,
        depositDeducted: item.depositDeducted
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * GET /api/admin/rentals/overdue
 */
exports.getOverdueRentals = async (req, res) => {
  try {
    const now = new Date();

    const orders = await Order.find({
      "items.type": "rent",
      "items.dueDate": { $lt: now },
      "items.returned": { $ne: true }
    })
      .populate("items.book")
      .populate("user", "name email");

    const result = [];

    orders.forEach(order => {
      order.items.forEach(item => {
        if (
          item.type === "rent" &&
          item.dueDate &&
          new Date(item.dueDate) < now &&
          !item.returned
        ) {
          result.push({
            orderId: order._id,
            itemId: item._id,
            book: item.book,
            user: order.user,
            dueDate: item.dueDate,
            overdueDays: item.overdueDays || 0,
            fineAmount: item.fineAmount || 0
          });
        }
      });
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
