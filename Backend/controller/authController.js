const { sendOtpEmail } = require("../utils/email.js");
const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const OTP = require("../models/OTP.js");
const jwt = require("jsonwebtoken");

//generate token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
// Register User

exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(400)
      .json({ error: "User already exists with this email." });
  }

  // 2. Hash the password securely
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isVerified: false,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Otp For ${email}:${otp}`);
    await sendOtpEmail(email, otp, "account_verification");
    await OTP.create({ email, otp, action: "account_verification" });

    res.status(201).json({
      message:
        "User Register Successfully. please Check Your Email For OTP To Verify Your Account",
      email: user.email,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  let user = await User.findOne({ email });
  if (!user) {
    return res
      .status(400)
      .json({ error: "Invalid Credentials,Please Signup First" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid Credentials" });
  }

  if (!user.isVerified && user.role == "user") {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email, action: "account_verification" }); //remove old otp
    await OTP.create({ email, otp, action: "account_verification" });
    await sendOtpEmail(email, otp, "account_verification");

    return res.status(400).json({
      error: "Account not verified.A new OTP has been send to your Email",
    });
  }

  res.status(200).json({
    message: "Login Succesfull",
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role),
  });
};

//verify Otp
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const otpRecord = await OTP.findOne({
    email,
    otp,
    action: "account_verification",
  });

  if (!otpRecord) {
    return res.status(400).json({ error: "Invalid Or Expire OTP" });
  }
  //if match the otp
  const user = await User.findOneAndUpdate({ email }, { isVerified: true });
  await OTP.deleteMany({ email, action: "account_verification" });

  res.json({
    message: "Account verified successfully .you can now login.",
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role),
  });
};
