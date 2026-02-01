const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  type: { type: String, enum: ["purchase", "rent"], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // unit price
  duration: { type: Number }, // for rental days
  dueDate: { type: Date },

  // explicit return fields for rentals
  returned: { type: Boolean, default: false },
  returnDate: { type: Date },
  overdueDays: { type: Number, default: 0 },
  fineAmount: { type: Number, default: 0 }, // optional fine for overdue

  depositDeducted: { type: Number, default: 0 },
  depositRefund: { type: Number, default: 0 },

  safeAmount: { type: Number, default: 0 },
  finePaid: { type: Boolean, default: false },
  finePaymentId: { type: String },
  extraFinePaidAmount: { type: Number, default: 0 },

});

const refundSchema = new mongoose.Schema({
  status: { type: String, enum: ["none", "pending", "approved", "declined"], default: "none" },
  refundDate: { type: Date },
  refundAmount: { type: Number, default: 0 },
  reason: { type: String }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true }, // INR (not paise)
  // NEW — global refundable deposit
  totalDeposit: { type: Number, default: 0 },
  depositRefunded: { type: Boolean, default: false },
  
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },

  shippingAddress: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String
  },


  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending"
  },
  orderStatus: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Processing"
  },

  // explicit refund object
  refund: { type: refundSchema, default: () => ({}) },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
