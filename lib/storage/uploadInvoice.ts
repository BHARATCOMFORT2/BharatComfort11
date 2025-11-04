import { storage } from "@/lib/firebaseadmin";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * 🔹 Uploads a generated invoice PDF to Firebase Storage
 * @param {Buffer} fileBuffer - The generated PDF buffer
 * @param {string} invoiceId - Unique invoice identifier (e.g., INV-BK-12345)
 * @param {"booking" | "refund"} type - Determines upload path
 * @returns {Promise<string>} - Public download URL
 */
export async function uploadInvoiceToFirebase(
  fileBuffer: Buffer,
  invoiceId: string,
  type: "booking" | "refund"
): Promise<string> {
  try {
    // 🔸 Path structure: /invoices/bookings/... or /invoices/refunds/...
    const filePath = `invoices/${type === "booking" ? "bookings" : "refunds"}/${invoiceId}.pdf`;
    const fileRef = ref(storage, filePath);

    // 🔸 Upload PDF to Firebase
    await uploadBytes(fileRef, fileBuffer, { contentType: "application/pdf" });

    // 🔸 Get public download URL
    const url = await getDownloadURL(fileRef);

    console.log(`✅ Uploaded ${type} invoice:`, url);
    return url;
  } catch (err) {
    console.error("❌ Invoice upload failed:", err);
    throw new Error("Failed to upload invoice PDF");
  }
}
