import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

/**
 * Configure Email Transport
 * Replace with your SMTP or SendGrid credentials
 */
const transporter = nodemailer.createTransport({
  service: "gmail", // or "SendGrid", "Outlook", "Yahoo"
  auth: {
    user: functions.config().email.user, // set via: firebase functions:config:set email.user="..."
    pass: functions.config().email.pass, // set via: firebase functions:config:set email.pass="..."
  },
});

/**
 * 📧 Send Email on Booking Creation
 */
export const sendEmailOnBooking = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    if (!booking) return;

    try {
      // Fetch related listing info
      const listingRef = await db.collection("listings").doc(booking.listingId).get();
      const listing = listingRef.data();

      // Email details
      const mailOptions = {
        from: `"BharatComfort" <${functions.config().email.user}>`,
        to: booking.userEmail, // user who booked
        subject: `Booking Confirmation - ${listing?.name || "Your Trip"}`,
        html: `
          <h2>Booking Confirmation</h2>
          <p>Hello ${booking.userName},</p>
          <p>Thank you for booking <strong>${listing?.name}</strong> with BharatComfort.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li>Check-in: ${booking.checkIn}</li>
            <li>Check-out: ${booking.checkOut}</li>
            <li>Guests: ${booking.guests}</li>
          </ul>
          <p>You can manage your booking from your dashboard.</p>
          <p>Safe travels! 🌍</p>
        `,
      };

      // Send email
      await transporter.sendMail(mailOptions);

      console.log("Booking email sent to:", booking.userEmail);
    } catch (err) {
      console.error("Error sending booking email:", err);
    }
  });
