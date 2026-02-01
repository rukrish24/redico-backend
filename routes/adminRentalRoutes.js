const express = require("express");
const { getPendingFineRentals } = require("../controllers/adminRentalController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware"); // assuming you have this

const router = express.Router();

/* ================= PENDING FINE RENTALS ================= */
router.get("/pending-fines", auth, admin, getPendingFineRentals);

module.exports = router;
