import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();
const db = admin.firestore();
const fcm = admin.messaging();

// Set SendGrid API Key (Firebase environment config)
sgMail.setApiKey(functions.config().sendgrid.apikey);

/**
 * Trigger: On new chat message
 * Firestore + Email (if offline) + Push Notification (FCM)
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

      // 🔹 Always create Firestore notification
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

      // 🔹 Fetch recipient data
      const recipientDoc = await db.collection("users").doc(recipientId).get();
      const recipientData = recipientDoc.data();

      // 🔹 Check if offline → send email
      if (recipientData && recipientData.isOnline === false && recipientData.email) {
        const msg = {
          to: recipientData.email,
          from: "noreply@bharatcomfort.com",
          subject: "💬 New Message on BharatComfort",
          text: `You received a new message from ${message.senderName || "someone"}: "${message.text}".`,
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

      // 🔹 Send Push Notifications (FCM)
      const tokensSnapshot = await db
        .collection("users")
        .doc(recipientId)
        .collection("fcmTokens")
        .get();

      if (!tokensSnapshot.empty) {
        const tokens = tokensSnapshot.docs.map((doc) => doc.id);

        const payload: admin.messaging.MulticastMessage = {
          notification: {
            title: "💬 New Message",
            body: `From ${message.senderName || "someone"}: ${message.text}`,
          },
          data: {
            chatId,
            senderId: message.senderId,
          },
          tokens,
        };

        const response = await fcm.sendEachForMulticast(payload);
        console.log("📲 Push notifications sent:", response.successCount);
      } else {
        console.log("⚠️ No FCM tokens for user:", recipientId);
      }
    } catch (err) {
      console.error("❌ Error handling chat notification:", err);
    }
  });
