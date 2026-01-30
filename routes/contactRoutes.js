const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  createMessage
} = require("../controllers/contactController");

router.post("/", auth, createMessage);

module.exports = router;
