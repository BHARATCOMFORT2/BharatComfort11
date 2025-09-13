import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Trigger: On new chat message
 * Sends notification to the recipient (user/partner/staff)
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

      // Create notification entry in Firestore
      await db.collection("notifications").add({
        title: "💬 New Message",
        message: `You have a new message from ${message.senderName || "someone"}.`,
        type: "chat",
        chatId,
        userId: recipientId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });

      console.log(`📩 Notification sent to user ${recipientId}`);
    } catch (err) {
      console.error("❌ Error creating chat notification:", err);
    }
  });
