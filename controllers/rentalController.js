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

    if (item.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueDate = new Date(item.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        const diffMs = today - dueDate;
        overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
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
    // normalize "today" to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      "items.type": "rent",
      "items.returned": { $ne: true }
    })
      .populate({
  path: "items.book",
  select: "title image"
})
      .populate("user", "name email");

    const result = [];

    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.type !== "rent" || item.returned || !item.dueDate) return;

        const dueDate = new Date(item.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        // Overdue ONLY if today > dueDate
        if (today > dueDate) {
          const diffMs = today - dueDate;
          const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          result.push({
            orderId: order._id,
            itemId: item._id,
            book: item.book,
            user: order.user,
            dueDate: item.dueDate,
            overdueDays,
            fineAmount: overdueDays > 0 ? overdueDays * 20 : 0 // preview only
          });
        }
      });
    });

    

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
