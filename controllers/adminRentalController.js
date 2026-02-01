const Order = require("../models/Order");

/* ================= PENDING EXTRA FINE RENTALS ================= */
exports.getPendingFineRentals = async (req, res) => {
  try {
    const orders = await Order.find({
      "items.returned": true,
      "items.finePaid": false
    })
      .populate("user", "name email")
      .populate("items.book", "title");

    const pendingFines = [];

    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.type !== "rent") return;

        const deposit = (item.safeAmount || 0) * item.quantity;
        const extraFine = item.fineAmount - deposit;

        if (
          item.returned &&
          !item.finePaid &&
          extraFine > 0
        ) {
          pendingFines.push({
            orderId: order._id,
            itemId: item._id,
            bookTitle: item.book?.title,
            userName: order.user?.name,
            userEmail: order.user?.email,
            fineAmount: item.fineAmount,
            deposit,
            extraFine,
            returnedOn: item.returnDate
          });
        }
      });
    });

    res.json(pendingFines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
