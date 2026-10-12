const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. Send OTP Verification Email (with dynamic title/message based on type)
exports.sendOtpEmail = async (userEmail, otp, type) => {
  try {
    const title =
      type === "account_verification"
        ? "Verify your EventHive account"
        : "EventHive Booking Verification";
    const msg =
      type === "account_verification"
        ? "Please use the following OTP to verify your EventHive account."
        : "Please use the following OTP to verify and confirm your event booking.";

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Your OTP Code",
      text: `Your OTP Code Is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #eaeaea; border-radius: 12px; background-color: #fafafa;">
            <h2 style="color: #111; margin-bottom: 10px;">${title}</h2>
            <p style="color: #555; font-size: 16px; margin-bottom: 20px;">${msg}</p>
            <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; color: #2563eb; background: #fff; display: inline-block; border-radius: 8px; border: 1px solid #ddd; letter-spacing: 4px;">
                ${otp}
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 25px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP Email Sent to ${userEmail} for ${type}`);
  } catch (error) {
    console.error(
      `Error sending OTP email to ${userEmail} for ${type}:`,
      error,
    );
  }
};

// 2. Send Booking Confirmation Email
const sendBookingEmail = async (userEmail, userName, eventTitle) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Booking Confirmed: ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #2563eb;">Booking Successful! 🎉</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Thank you for booking with us. Your spot for <strong>${eventTitle}</strong> has been successfully secured.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
            <p style="font-size: 14px; color: #666;">We look forward to seeing you at the event!</p>
            <p style="font-size: 14px; color: #666;">Best regards,<br><strong>EventHive Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Booking Confirmation Email Sent to ${userEmail}`);
  } catch (error) {
    console.error(`Error sending booking email to ${userEmail}:`, error);
  }
};

// Export both functions properly
exports.sendBookingEmail = sendBookingEmail;
