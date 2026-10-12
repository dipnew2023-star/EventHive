const Booking = require("../models/Booking.js");
const OTP = require("../models/OTP.js");
const Event = require("../models/Event.js");
const { sendOtpEmail, sendBookingEmail } = require("../utils/email.js");
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendBookingOTP = async (req, res) => {
  const otp = generateOtp();
  await OTP.findOneAndDelete({
    email: req.user.email,
    action: "event_booking",
  });
  await OTP.create({
    email: req.user.email,
    otp: otp,
    action: "event_booking",
  });
  await sendOtpEmail(req.user.email, otp, "event_booking"); // Fixed function name
  res.json({ message: "OTP sent to email" }); // Fixed spelling
};

exports.bookEvent = async (req, res) => {
  const { eventId, otp } = req.body;
  const otpRecord = await OTP.findOne({
    email: req.user.email,
    otp,
    action: "event_booking",
  });
  if (!otpRecord) {
    return res.status(400).json({ error: "Invalid Or Expired OTP" });
  }
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({ error: "Event Not Found" });
  }

  // Seat checking
  if (event.availableSeats <= 0) {
    return res.status(400).json({ error: "No Seats Available" });
  }
  const existingBooking = await Booking.findOne({
    userId: req.user._id,
    eventId,
  });
  if (existingBooking) {
    return res
      .status(400)
      .json({ error: "You Have Already Booked This Event" });
  }

  const booking = await Booking.create({
    userId: req.user._id,
    eventId,
    status: "pending",
    paymentStatus: "non_paid",
    amount: event.ticketPrice,
  });

  // Delete old OTP
  await OTP.deleteMany({ email: req.user.email, action: "event_booking" });
  return res
    .status(201)
    .json({ message: "Booking Created. Please Check Your Email." });
};

exports.confirmBooking = async (req, res) => {
  const paymentStatus = req.body.paymentStatus;
  if (!["paid", "non_paid"].includes(paymentStatus)) {
    return res.status(400).json({ error: "Invalid payment status" });
  }

  const booking = await Booking.findById(req.params.id).populate("eventId");

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }
  if (booking.status === "confirmed") {
    return res.status(400).json({ error: "Booking is already confirmed" });
  }

  const event = await Event.findById(booking.eventId._id);
  if (event.availableSeats <= 0) {
    return res.status(400).json({ error: "No Seats Available" });
  }

  booking.status = "confirmed";
  if (paymentStatus) {
    booking.paymentStatus = paymentStatus;
  }
  await booking.save();

  event.totalSeats -= 1;
  await event.save();

  await sendBookingEmail(req.user.email, req.user.name, event.title);

  res.json({ message: "Booking Confirmed" });
};

exports.getMyBooking = async (req, res) => {
  const bookings = await Booking.find({ userId: req.user._id }).populate(
    "eventId",
  );
  res.json(bookings);
};

exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("eventId");
  if (!booking) {
    return res.status(404).json({ error: "Booking Not Found" });
  }
  if (booking.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Check if it was confirmed BEFORE changing status, so we can restore the seat
  if (booking.status === "confirmed") {
    const event = await Event.findById(booking.eventId._id);
    if (event) {
      event.totalSeats += 1;
      await event.save();
    }
  }

  // Use deleteOne() instead of remove() for Mongoose v9 compatibility
  await booking.deleteOne();

  res.json({ message: "Booking Cancelled Successfully" });
};
