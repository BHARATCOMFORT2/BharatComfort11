"use client";

import { useState } from "react";
import {
  X,
  FileText,
  MessageCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function PartnerDisputeModal({
  dispute,
  onClose,
}: {
  dispute: any;
  onClose: () => void;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  if (!dispute) return null;

  const handleReply = async () => {
    if (!reply.trim()) return alert("Enter a message before sending.");

    try {
      setSending(true);
      const user = getAuth().currentUser;
      if (!user) throw new Error("User not authenticated.");

      const ref = doc(db, "settlement_disputes", dispute.id);
      await updateDoc(ref, {
        partnerReplies: arrayUnion({
          text: reply,
          timestamp: serverTimestamp(),
          uid: user.uid,
          role: "partner",
        }),
        updatedAt: serverTimestamp(),
      });

      alert("Reply sent successfully.");
      setReply("");
    } catch (err) {
      console.error("Reply error:", err);
      alert("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  const stage =
    dispute.status === "open"
      ? 1
      : dispute.status === "in_review"
      ? 2
      : 3;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-[520px] p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-2">🧾 Dispute Details</h2>
        <p className="text-xs text-gray-500 mb-4">
          Settlement ID: {dispute.settlementId}
        </p>

        {/* Status Timeline */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex flex-col items-center text-xs">
            <Clock
              className={`h-5 w-5 ${
                stage >= 1 ? "text-yellow-600" : "text-gray-400"
              }`}
            />
            <span className="mt-1">Opened</span>
          </div>
          <div
            className={`flex-1 h-[2px] mx-2 ${
              stage >= 2 ? "bg-blue-500" : "bg-gray-200"
            }`}
          ></div>
          <div className="flex flex-col items-center text-xs">
            <MessageCircle
              className={`h-5 w-5 ${
                stage >= 2 ? "text-blue-600" : "text-gray-400"
              }`}
            />
            <span className="mt-1">In Review</span>
          </div>
          <div
            className={`flex-1 h-[2px] mx-2 ${
              stage === 3 ? "bg-green-500" : "bg-gray-200"
            }`}
          ></div>
          <div className="flex flex-col items-center text-xs">
            <CheckCircle
              className={`h-5 w-5 ${
                stage === 3 ? "text-green-600" : "text-gray-400"
              }`}
            />
            <span className="mt-1">Resolved</span>
          </div>
        </div>

        {/* Dispute Info */}
        <div className="text-sm space-y-2 mb-5">
          <p>
            <b>Status:</b>{" "}
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                dispute.status === "open"
                  ? "bg-yellow-100 text-yellow-700"
                  : dispute.status === "in_review"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {dispute.status.toUpperCase()}
            </span>
          </p>
          <p>
            <b>Reason:</b> {dispute.reason}
          </p>
          {dispute.adminRemark && (
            <p>
              <b>Admin Remark:</b> {dispute.adminRemark}
            </p>
          )}
          {dispute.fileUrl && (
            <a
              href={dispute.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 flex items-center mt-1"
            >
              <FileText className="mr-1 h-4 w-4" /> View Attachment
            </a>
          )}
        </div>

        {/* Partner Reply */}
        <div className="border-t pt-3 mt-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center">
            <MessageCircle className="mr-2 h-4 w-4 text-blue-600" /> Your Reply
          </h4>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a clarification or note for the admin..."
            className="w-full border rounded-lg p-2 text-sm min-h-[70px]"
          ></textarea>
          <Button
            onClick={handleReply}
            disabled={sending}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
          >
            {sending ? "Sending..." : "Send Reply"}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
