const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Book = require("./models/Book");
const books = require("./data/bookData");

dotenv.config();
connectDB();

const seedBooks = async () => {
  try {
    await Book.deleteMany(); 
    await Book.insertMany(books); 
    console.log("📚 Book data inserted successfully!");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedBooks();
