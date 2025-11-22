"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Headphones, Briefcase, Users, PhoneCall, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function HiringForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    experience: "",
    message: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Success Popup
  const [showPopup, setShowPopup] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.role) {
      toast.error("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const submissionData = new FormData();
      Object.entries(formData).forEach(([key, value]) =>
        submissionData.append(key, value)
      );
      if (resume) submissionData.append("resume", resume);

      const res = await fetch("/api/hiring", {
        method: "POST",
        body: submissionData,
      });

      if (!res.ok) throw new Error("Failed to submit form");

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
        experience: "",
        message: "",
      });
      setResume(null);

      // 🔥 SHOW POPUP (not toast)
      setShowPopup(true);

    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ Submission Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl animate-in fade-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600" />

              <h2 className="text-2xl font-semibold text-gray-800">
                Application Submitted!
              </h2>

              <p className="text-gray-600">
                Your application has been successfully submitted.  
                Our team will review it and connect with you soon.
              </p>

              <Button
                onClick={() => setShowPopup(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <section
        id="hiring"
        className="relative py-24 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      >
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-72 h-72 bg-blue-300/30 rounded-full blur-3xl animate-pulse top-0 left-0" />
          <div className="absolute w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl animate-pulse bottom-0 right-0" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-3">
            Join Our Team at <span className="text-blue-600">BHARATCOMFORT11</span>
          </h2>
          <p className="text-gray-600 mb-10 max-w-2xl mx-auto">
            Be part of India’s growing travel platform redefining comfort and convenience.
            We're hiring passionate Telecallers, Marketing, and Operations professionals.
          </p>

          {/* Open Positions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <JobCard
              icon={<PhoneCall className="w-8 h-8 text-blue-600" />}
              title="Telecaller"
              desc="Engage with potential customers, share offers, and assist with bookings."
            />
            <JobCard
              icon={<Briefcase className="w-8 h-8 text-blue-600" />}
              title="Marketing Executive"
              desc="Drive growth through creative campaigns and partnership initiatives."
            />
            <JobCard
              icon={<Users className="w-8 h-8 text-blue-600" />}
              title="Operations Executive"
              desc="Ensure smooth daily operations and partner coordination for tours."
            />
            <JobCard
              icon={<Headphones className="w-8 h-8 text-blue-600" />}
              title="Customer Support"
              desc="Deliver fast, friendly assistance and resolve traveler queries efficiently."
            />
          </div>

          {/* Application Form */}
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-3xl p-8 md:p-10 border border-gray-100 max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div>
                <Label>Full Name *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Email *</Label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Role Applying For *</Label>
                  <Select
                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Telecaller">Telecaller</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Experience *</Label>
                  <Input
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="e.g. 2 years / Fresher"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Message (optional)</Label>
                <Textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <Label>Upload Resume (optional)</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResume(e.target.files?.[0] || null)}
                />
                {resume && (
                  <p className="text-sm text-gray-500 mt-1">
                    File: {resume.name}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" /> Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

/* Job Card */
function JobCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-transform duration-300">
      <div className="flex flex-col items-center text-center space-y-3">
        {icon}
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
