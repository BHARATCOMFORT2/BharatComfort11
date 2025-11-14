"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Copy,
  UserPlus,
  Gift,
  Loader2,
  Share2,
  Check,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  async function loadData() {
    const res = await fetch("/api/referrals");
    const data = await res.json();

    setReferralCode(data?.referralCode?.referralCode || "");
    setReferrals(data?.referrals || []);
    setLoading(false);
  }

  async function generateCode() {
    setLoading(true);

    const res = await fetch("/api/referrals/generate", {
      method: "POST",
    });

    const data = await res.json();
    if (data.referralCode) setReferralCode(data.referralCode);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const referralLink = `https://www.bharatcomfort.online/?ref=${referralCode}`;

  function copyCode() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function whatsappShare() {
    window.open(
      `https://wa.me/?text=Join%20BharatComfort!%20Use%20my%20referral%20code:%20${referralCode}%20Link:%20${referralLink}`
    );
  }

  function telegramShare() {
    window.open(
      `https://t.me/share/url?url=${referralLink}&text=Join BharatComfort! Use my referral code: ${referralCode}`
    );
  }

  function emailShare() {
    window.location.href = `mailto:?subject=Join BharatComfort&body=Use my referral code: ${referralCode}\n${referralLink}`;
  }

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-700" />
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 space-y-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* HEADER */}
      <motion.h1
        className="text-5xl font-extrabold bg-gradient-to-r from-yellow-700 to-yellow-500 text-transparent bg-clip-text flex items-center gap-3"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <UserPlus className="w-10 h-10 text-yellow-600" />
        Refer & Earn
      </motion.h1>

      {/* TOP STATS */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-6 rounded-2xl bg-white/30 shadow-lg backdrop-blur-md border border-yellow-100 flex items-center gap-4">
          <Wallet className="w-10 h-10 text-yellow-700" />
          <div>
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-yellow-700">
              ₹{referrals.filter((r) => r.status === "completed").length * 50}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/30 shadow-lg backdrop-blur-md border border-yellow-100 flex items-center gap-4">
          <Users className="w-10 h-10 text-yellow-700" />
          <div>
            <p className="text-sm text-gray-600">Total Referrals</p>
            <p className="text-2xl font-bold text-yellow-700">
              {referrals.length}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/30 shadow-lg backdrop-blur-md border border-yellow-100 flex items-center gap-4">
          <Gift className="w-10 h-10 text-yellow-700" />
          <div>
            <p className="text-sm text-gray-600">Successful Referrals</p>
            <p className="text-2xl font-bold text-yellow-700">
              {referrals.filter((r) => r.status === "completed").length}
            </p>
          </div>
        </div>
      </motion.div>

      {/* REFERRAL CODE */}
      <motion.div
        className="bg-gradient-to-br from-[#fff8e1] via-[#fff3d0] to-[#ffecb3] p-8 rounded-3xl shadow-xl border border-yellow-200"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {!referralCode ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">
              You don’t have a referral code yet.
            </p>
            <button
              onClick={generateCode}
              className="mt-6 px-6 py-3 rounded-xl bg-yellow-700 text-white shadow-md text-lg"
            >
              Generate My Referral Code
            </button>
          </div>
        ) : (
          <>
            <p className="text-lg font-semibold">Your Referral Code</p>
            <p className="text-4xl font-bold text-yellow-800 mt-2 tracking-wider">
              {referralCode}
            </p>

            <div className="mt-6 flex gap-3 flex-wrap">
              <button
                onClick={copyCode}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg flex items-center gap-2 shadow-md"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>

              <button
                onClick={whatsappShare}
                className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md"
              >
                WhatsApp
              </button>

              <button
                onClick={telegramShare}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md"
              >
                Telegram
              </button>

              <button
                onClick={emailShare}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg shadow-md"
              >
                Email
              </button>
            </div>

            {/* QR Code */}
            <motion.div
              className="mt-10 flex justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="p-4 bg-white rounded-2xl shadow-lg border border-yellow-200">
                <QRCode value={referralLink} size={180} />
              </div>
            </motion.div>

            <p className="text-center text-gray-600 mt-3 text-sm">
              Scan to join using your referral link
            </p>
          </>
        )}
      </motion.div>

      {/* REFERRAL ACTIVITY */}
      <motion.div
        className="bg-white p-8 rounded-3xl shadow-lg border border-yellow-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold text-yellow-700 mb-6">
          Your Referral Activity
        </h2>

        {referrals.length === 0 ? (
          <p className="text-gray-600">You haven’t referred anyone yet.</p>
        ) : (
          <div className="space-y-4">
            {referrals.map((r) => (
              <motion.div
                key={r.id}
                className="p-5 rounded-xl border border-gray-200 bg-yellow-50/40 shadow-sm"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {r.referredEmail || r.referredUserId}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status:{" "}
                      <b
                        className={
                          r.status === "completed"
                            ? "text-green-700"
                            : "text-yellow-700"
                        }
                      >
                        {r.status}
                      </b>
                    </p>
                  </div>

                  <p className="text-sm text-gray-500">
                    {r.createdAt?.seconds
                      ? new Date(r.createdAt.seconds * 1000).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
