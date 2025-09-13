import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();
const db = admin.firestore();

// Set SendGrid API Key (via Firebase environment config)
sgMail.setApiKey(functions.config().sendgrid.apikey);

/**
 * Trigger: On new chat message
 * Sends Firestore notification + email (if recipient offline)
 */
export const chatNotifications = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { chatId, messageId } = context.params;

    console.log("💬 New message:", messageId, "in chat:", chatId);

    if (!message) return null;

    try {
      const recipientId = message.recipientId;
      const senderId = message.senderId;

      // 🔹 Create Firestore notification
      await db.collection("notifications").add({
        title: "💬 New Message",
        message: `You have a new message from ${message.senderName || "someone"}.`,
        type: "chat",
        chatId,
        userId: recipientId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });

      console.log(`📩 Firestore notification created for ${recipientId}`);

      // 🔹 Check if recipient is online
      const recipientDoc = await db.collection("users").doc(recipientId).get();
      const recipientData = recipientDoc.data();

      if (recipientData && recipientData.isOnline === false) {
        console.log(`📧 User ${recipientId} is offline → sending email`);

        const msg = {
          to: recipientData.email,
          from: "noreply@bharatcomfort.com", // Verified sender
          subject: "💬 New Message on BharatComfort",
          text: `You received a new message from ${message.senderName || "someone"}: "${message.text}".
          
          Login to BharatComfort to reply.`,
          html: `
            <h2>💬 New Message on BharatComfort</h2>
            <p>You received a new message from <b>${message.senderName || "someone"}</b>:</p>
            <blockquote>${message.text}</blockquote>
            <p><a href="https://bharatcomfort.com/chat/${chatId}">👉 Reply Now</a></p>
          `,
        };

        await sgMail.send(msg);
        console.log(`📧 Email sent to ${recipientData.email}`);
      }
    } catch (err) {
      console.error("❌ Error handling chat notification:", err);
    }
  });
