import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

/**
 * Configure Email Transport (SMTP / Gmail / SendGrid)
 */
const transporter = nodemailer.createTransport({
  service: "gmail", // change if using SendGrid, Outlook, etc.
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass,
  },
});

/**
 * 📧 Send Email When a New Notification is Created
 */
export const sendEmailOnNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    if (!notification) return;

    try {
      // Fetch all users who opted-in for email notifications
      const usersSnap = await db.collection("users")
        .where("preferences.emailNotifications", "==", true)
        .get();

      const recipients = usersSnap.docs.map(doc => doc.data().email);

      if (recipients.length === 0) {
        console.log("No users opted for email notifications.");
        return;
      }

      const mailOptions = {
        from: `"BharatComfort" <${functions.config().email.user}>`,
        to: recipients,
        subject: `📢 ${notification.title || "New Update from BharatComfort"}`,
        html: `
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          ${
            notification.listingId
              ? `<p><a href="https://bharatcomfort.com/listings/${notification.listingId}">View Listing</a></p>`
              : ""
          }
          <p>Stay connected with BharatComfort 🌍</p>
        `,
      };

      // Send email to all users
      await transporter.sendMail(mailOptions);

      console.log("Notification emails sent to:", recipients);
    } catch (err) {
      console.error("Error sending notification emails:", err);
    }
  });
