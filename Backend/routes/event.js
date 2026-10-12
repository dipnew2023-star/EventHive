const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth.js");
const {
  getAllEvent,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controller/eventConroller.js");

//get all event
router.get("/", getAllEvent);

//get event by id
router.get("/:id", getEventById);

//create event (admin only)
router.post("/", protect, admin, createEvent);

//update event
router.put("/:id", protect, admin, updateEvent);

//delete event
router.delete("/:id", protect, admin, deleteEvent);

module.exports = router;
