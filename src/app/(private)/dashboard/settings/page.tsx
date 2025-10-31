"use client";

import { getUserByWallet, updateUserProfile } from "@/actions/supabase/users";
import { imageFileToObjectUrl } from "@/utils/files";
import { validateEmail } from "@/utils/validation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useActiveAccount } from "thirdweb/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function SettingsPage() {
  const { updateProfile } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modalParam = searchParams.get("modal");
  const [showEditProfile, setShowEditProfile] = useState(
    modalParam === "profile"
  );

  const [formData, setFormData] = useState({
    firstname: null as string | null,
    lastname: null as string | null,
    username: null as string | null,
    email: null as string | null,
    bio: null as string | null,
    profile_image: null as string | File | null,
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const userAccount = useActiveAccount();

  useEffect(() => {
    setShowEditProfile(modalParam === "profile");
  }, [modalParam]);

  const fetchUserProfile = async () => {
    if (!userAccount) return;
    const userRes = await getUserByWallet(userAccount.address);
    if (userRes.success && userRes.data) {
      const { firstname, lastname, username, email, bio, profile_image } =
        userRes.data;
      setFormData({ firstname, lastname, username, email, bio, profile_image });
      setInitialFormData({
        firstname,
        lastname,
        username,
        email,
        bio,
        profile_image,
      });
    } else {
      toast.error(userRes.message || "Failed to fetch user profile");
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccount) return;

    if (formData.email && !validateEmail(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const cleanedData = {
      firstname: formData.firstname || null,
      lastname: formData.lastname || null,
      username: formData.username || null,
      email: formData.email || null,
      bio: formData.bio || null,
      profile_image: formData.profile_image,
    };

    try {
      const result = await updateUserProfile(userAccount.address, cleanedData);
      if (result.success) {
        toast.success("Profile updated successfully");
        updateProfile({
          username: cleanedData.username || undefined,
          profile_image:
            cleanedData.profile_image instanceof File
              ? imageFileToObjectUrl(cleanedData.profile_image)
              : cleanedData.profile_image || undefined,
        });
        setShowEditProfile(false);
        router.replace("/dashboard/settings"); // clean up ?modal param
        await fetchUserProfile();
      } else {
        throw new Error(result.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    }
  };

  const handleCancel = () => {
    setShowEditProfile(false);
    router.replace("/dashboard/settings"); // clean param
  };

  // RESPONSIVE MODAL VARIANT
  const modalClasses =
    "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6";
  const modalInner =
    "relative w-full sm:max-w-lg bg-[#191919] border border-[#232323] rounded-2xl p-6 sm:p-8 shadow-lg overflow-auto max-h-[90vh]";

  return (
    <div className="flex-1 bg-[#050505] min-h-screen p-6 sm:p-8">
      <div className="space-y-6">
        <h1 className="text-[#F5F5F5] text-2xl font-bold mb-4">Settings</h1>

        <div className="flex flex-col gap-6">
          {/* Clickable cards */}
          <div
            className="flex items-center gap-4 p-5 bg-[#111111] border border-[#232323] rounded-2xl cursor-pointer hover:bg-[#191919] transition"
            onClick={() => router.push("/dashboard/settings?modal=profile")}
          >
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="#5D5D5D"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="7" r="4" />
              <path d="M3 19a9 9 0 0 1 18 0" />
            </svg>
            <span className="text-[#DADADA] font-medium text-lg">Profile</span>
          </div>

          <div className="flex items-center gap-4 p-5 bg-[#111111] border border-[#232323] rounded-2xl cursor-pointer hover:bg-[#191919] transition">
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="#5D5D5D"
              strokeWidth="1.5"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
            <span className="text-[#DADADA] font-medium text-lg">Security</span>
          </div>

          <div className="flex items-center gap-4 p-5 bg-[#111111] border border-[#232323] rounded-2xl cursor-pointer hover:bg-[#191919] transition">
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="#5D5D5D"
              strokeWidth="1.5"
            >
              <path d="M4 8a8 8 0 0 1 16 0v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
            </svg>
            <span className="text-[#DADADA] font-medium text-lg">
              Notifications
            </span>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showEditProfile && (
        <div className={modalClasses}>
          <div className={modalInner}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl text-white font-bold">
                Edit Profile
              </h2>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-[#2B2B2B] rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Foem */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture */}
              <div className="flex justify-center">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                  <img
                    src={
                      formData.profile_image instanceof File
                        ? imageFileToObjectUrl(formData.profile_image)
                        : formData.profile_image || "/default-avatar.svg"
                    }
                    alt="Profile"
                    className="w-full h-full rounded-full border border-[#494949] object-cover"
                  />

                  <label className="absolute bottom-1 right-1 bg-[#2B2B2B] border border-[#191919] rounded-full p-1.5 cursor-pointer hover:bg-[#494949] transition">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setFormData({
                            ...formData,
                            profile_image: e.target.files[0],
                          });
                        }
                      }}
                    />
                    📷
                  </label>
                </div>
              </div>

              {/* Name Fields */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[#5D5D5D] text-sm mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstname || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, firstname: e.target.value })
                    }
                    placeholder="First name"
                    className="w-full rounded-xl bg-[#0F0F0F] border border-[#2B2B2B] p-3 text-sm text-[#C1C1C1] focus:border-[#494949] outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[#5D5D5D] text-sm mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastname || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, lastname: e.target.value })
                    }
                    placeholder="Last name"
                    className="w-full rounded-xl bg-[#0F0F0F] border border-[#2B2B2B] p-3 text-sm text-[#C1C1C1] focus:border-[#494949] outline-none"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[#5D5D5D] text-sm mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="Username"
                    className="w-full rounded-xl bg-[#0F0F0F] border border-[#2B2B2B] p-3 text-sm text-[#C1C1C1] focus:border-[#494949] outline-none"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-[#5D5D5D] text-sm mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    readOnly
                    disabled
                    className="w-full rounded-xl bg-[#0F0F0F] border border-[#2B2B2B] p-3 text-sm text-[#C1C1C1] focus:border-[#494949] outline-none"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-[#5D5D5D] text-sm mb-1">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="Bio"
                    className="w-full rounded-xl bg-[#0F0F0F] border border-[#2B2B2B] p-3 text-sm text-[#C1C1C1] focus:border-[#494949] outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2 rounded-xl border border-[#2B2B2B] text-[#C1C1C1] hover:bg-[#191919] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#232323] text-white hover:bg-[#2B2B2B] transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
