"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        toast.error(data.error || "Failed to fetch profile");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      toast.error("Error fetching profile");
    } finally {
      setLoading(false);
    }
  };

  const getFirebaseIdToken = async () => {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    return await user.getIdToken();
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Loading profile...
      </div>
    );

  if (!user)
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Failed to load profile.
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6">
          <div className="flex flex-col items-center space-y-3">
            <Image
              src={user.profilePhotoUrl || "/default-avatar.png"}
              alt="Profile"
              width={100}
              height={100}
              className="rounded-full border"
            />
            <p className="text-lg font-medium">{user.name}</p>
          </div>

          <div className="flex-1 space-y-3 w-full">
            <div className="grid grid-cols-2 gap-3">
              <p className="text-gray-600">Email:</p>
              <p className="font-medium">{user.email}</p>

              <p className="text-gray-600">Phone:</p>
              <p className="font-medium">{user.phone}</p>

              <p className="text-gray-600">Email Verified:</p>
              <p className={user.emailVerified ? "text-green-600" : "text-red-500"}>
                {user.emailVerified ? "Yes ✅" : "No ❌"}
              </p>

              <p className="text-gray-600">Phone Verified:</p>
              <p className={user.phoneVerified ? "text-green-600" : "text-red-500"}>
                {user.phoneVerified ? "Yes ✅" : "No ❌"}
              </p>

              <p className="text-gray-600">Role:</p>
              <p className="capitalize font-medium">{user.role || "user"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-medium mb-2">Verification Records</h2>

          <div className="grid grid-cols-2 gap-3">
            <p className="text-gray-600">Aadhaar Number:</p>
            <p className="font-medium">{user.aadharNumber || "-"}</p>

            <p className="text-gray-600">Aadhaar Document:</p>
            <p>
              {user.aadharImageUrl ? (
                <a
                  href={user.aadharImageUrl}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  View Aadhaar
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-medium mb-2">Refund Settings Summary</h2>

          <div className="grid grid-cols-2 gap-3">
            <p className="text-gray-600">Refund Mode:</p>
            <p className="font-medium capitalize">
              {user.refundPreference || "bank_transfer"}
            </p>

            {user.refundPreference === "bank_transfer" && (
              <>
                <p className="text-gray-600">Account Holder:</p>
                <p className="font-medium">
                  {user.bankDetails?.accountHolder || "-"}
                </p>

                <p className="text-gray-600">Account Number:</p>
                <p className="font-medium">
                  {user.bankDetails?.accountNumber
                    ? `****${user.bankDetails.accountNumber.slice(-4)}`
                    : "-"}
                </p>

                <p className="text-gray-600">IFSC Code:</p>
                <p className="font-medium">{user.bankDetails?.ifsc || "-"}</p>
              </>
            )}

            {user.refundPreference === "upi" && (
              <>
                <p className="text-gray-600">UPI ID:</p>
                <p className="font-medium">{user.bankDetails?.upi || "-"}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button onClick={() => router.push("/user/dashboard/settings")}>
          Edit Settings
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/help")}
          >
            Help Center
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const { getAuth } = await import("firebase/auth");
              const auth = getAuth();
              await auth.signOut();
              toast.success("Logged out successfully");
              router.push("/");
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
