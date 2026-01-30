
const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { getDashboardStats } = require("../controllers/adminController");
const { getAllMessages } = require("../controllers/contactController");

const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  processRefund
} = require("../controllers/adminController");

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

const { returnRental, getOverdueRentals } = require("../controllers/rentalController");

const router = express.Router();

router.get("/dashboard", auth, admin, getDashboardStats);
router.get("/messages", auth, admin, getAllMessages);

// ===== ORDERS =====
router.get("/orders", auth, admin, getAllOrders);
router.get("/orders/:id", auth, admin, getOrderById);
router.put("/orders/:id/status", auth, admin, updateOrderStatus);
router.post("/orders/:id/refund", auth, admin, processRefund);

// ===== RENTALS =====
router.post("/rentals/return/:orderId/:itemId", auth, admin, returnRental);
router.get("/rentals/overdue", auth, admin, getOverdueRentals);

// ===== CATEGORIES =====
router.get("/categories", auth, admin, getCategories);
router.post("/categories", auth, admin, createCategory);
router.put("/categories/:id", auth, admin, updateCategory);
router.delete("/categories/:id", auth, admin, deleteCategory);

module.exports = router;
