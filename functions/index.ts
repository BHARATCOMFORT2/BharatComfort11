import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

/* ============================================================
   🔔 Notify when new listing is added
============================================================ */
export const onListingCreated = functions.firestore
  .document("listings/{listingId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    const notification = {
      title: "New Listing Added",
      message: `${data.name} is now available for booking.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "listing",
      listingId: context.params.listingId,
    };

    await db.collection("notifications").add(notification);
  });

/* ============================================================
   ⭐ Auto Moderate Reviews
============================================================ */
export const onReviewCreated = functions.firestore
  .document("reviews/{reviewId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!data) return;

    const bannedWords = ["badword1", "badword2"];
    const hasBannedWord = bannedWords.some((w) =>
      data.text.toLowerCase().includes(w)
    );

    await snap.ref.update({
      status: hasBannedWord ? "flagged" : "approved",
    });
  });

/* ============================================================
   💳 Razorpay Webhook + Auto Referral Reward Trigger
============================================================ */
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);

    // ✅ Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("❌ Invalid Razorpay signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    const payload = req.body.payload.payment?.entity || req.body.payload.order?.entity;

    console.log("✅ Razorpay event received:", event);

    // 🧾 Handle successful payment
    if (event === "payment.captured" || event === "order.paid") {
      const orderId = payload.order_id;
      const paymentId = payload.id;
      const amount = payload.amount / 100;

      // 🔍 Find related booking
      const bookingSnap = await db
        .collection("bookings")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (bookingSnap.empty) {
        console.warn("⚠️ Booking not found for Razorpay order:", orderId);
        return res.status(200).send("No related booking found");
      }

      const bookingDoc = bookingSnap.docs[0];
      const bookingData = bookingDoc.data();

      // 💾 Update booking status
      await bookingDoc.ref.update({
        status: "paid",
        paymentId,
        paymentMethod: "razorpay",
        updatedAt: new Date(),
      });

      console.log(`💰 Booking ${bookingDoc.id} marked as PAID.`);

      // 🎯 Check referral for this user
      const referralSnap = await db
        .collection("referrals")
        .where("referredUserId", "==", bookingData.userId)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!referralSnap.empty) {
        const referralDoc = referralSnap.docs[0];
        const referralData = referralDoc.data();
        const referrerId = referralData.referrerId;

        const rewardAmount = Math.round(amount * 0.05); // 5% reward
        const referrerRef = db.collection("users").doc(referrerId);
        const referrerSnap = await referrerRef.get();
        const referrer = referrerSnap.data() || {};

        const newBalance = (referrer.walletBalance || 0) + rewardAmount;

        // 💳 Credit reward to wallet
        await referrerRef.set(
          {
            walletBalance: newBalance,
            totalEarnings: (referrer.totalEarnings || 0) + rewardAmount,
            referralStats: {
              successfulReferrals:
                (referrer.referralStats?.successfulReferrals || 0) + 1,
            },
            updatedAt: new Date(),
          },
          { merge: true }
        );

        // 🧾 Mark referral as completed
        await referralDoc.ref.set(
          {
            status: "completed",
            bookingAmount: amount,
            rewardAmount,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        // 🪙 Add wallet history record
        await referrerRef.collection("wallet").add({
          type: "credit",
          source: "referral_reward",
          referredUserId: bookingData.userId,
          amount: rewardAmount,
          bookingId: bookingDoc.id,
          createdAt: new Date(),
        });

        console.log(`🎁 Referral reward ₹${rewardAmount} credited to ${referrerId}`);
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("🔥 Razorpay webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});

/* ============================================================
   💰 Monthly Referral Rewards Aggregation
============================================================ */
export const scheduleReferralStats = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 0 1 * *")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthKey = `${year}-${(month + 1).toString().padStart(2, "0")}`;

    console.log(`🏁 Starting monthly referral aggregation for: ${monthKey}`);

    const participantsSnap = await db
      .collection("users")
      .where("userType", "in", ["creator", "agent"])
      .get();

    for (const doc of participantsSnap.docs) {
      const user = doc.data();
      const uid = doc.id;

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 1);

      const referralsSnap = await db
        .collection("referrals")
        .where("referrerId", "==", uid)
        .where("status", "==", "completed")
        .where("updatedAt", ">=", startDate)
        .where("updatedAt", "<", endDate)
        .get();

      if (referralsSnap.empty) continue;

      let totalBookingAmount = 0;
      let totalPartners = 0;

      referralsSnap.forEach((r) => {
        const d = r.data();
        if (d.bookingAmount) totalBookingAmount += d.bookingAmount;
        if (d.referredUserType === "partner") totalPartners++;
      });

      const rewardPercent = 5;
      const totalReward = Math.round(totalBookingAmount * (rewardPercent / 100));

      await db
        .collection("referralStatsMonthly")
        .doc(monthKey)
        .collection("users")
        .doc(uid)
        .set({
          uid,
          userType: user.userType,
          totalBookingAmount,
          totalPartners,
          rewardPercent,
          totalReward,
          payoutStatus: "pending",
          createdAt: new Date(),
        });

      await db.collection("users").doc(uid).set(
        {
          monthlyStats: {
            lastMonthKey: monthKey,
            totalBookingAmount,
            totalReward,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`✅ ${uid} → ₹${totalReward} monthly reward generated`);
    }

    console.log("🎯 Monthly referral aggregation completed.");
    return null;
  });
