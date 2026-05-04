import React, { useState, useRef, useEffect } from "react";
import type { UserProfile } from "../types";
import api from "../services/api";
import { getAccessToken } from "../utils/tokenStorage";

type TabKey = "profile" | "preferences" | "security";

const TABS: { key: TabKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  // { key: "preferences", label: "Preferences" },
  { key: "security", label: "Security" },
];

/**
 * Helper function to map API user response to UserProfile format
 * Handles differences between API response (notificationPreferences) and frontend types (preferences)
 */
function mapApiUserToUserProfile(apiUser: any): UserProfile {
  const preferences = apiUser.notificationPreferences || apiUser.preferences || {
    emailUpdates: true,
    pushNotifications: false,
    reminderTime: 30,
  };
  
  return {
    _id: apiUser._id,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    email: apiUser.email,
    university: apiUser.university,
    bio: apiUser.bio || "",
    avatar: apiUser.avatar || "",
    interests: Array.isArray(apiUser.interests) ? apiUser.interests : [],
    preferences: {
      emailUpdates: preferences.emailUpdates ?? true,
      pushNotifications: preferences.pushNotifications ?? false,
      reminderTime: preferences.reminderTime ?? 30,
    },
  };
}

// Small Camera/Upload SVG
function CameraIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <circle cx={10} cy={10} r={10} fill="#222" opacity="0.7" />
      <path
        d="M7.83 5.5L9 4h2l1.17 1.5H14A1.5 1.5 0 0 1 15.5 7v5.5A1.5 1.5 0 0 1 14 14H6a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 6 5.5h1.83ZM10 12.5A2 2 0 1 0 10 8.5a2 2 0 0 0 0 4Z"
        fill="#fff"
      />
    </svg>
  );
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields state (clone user for changes)
  const [editProfile, setEditProfile] = useState({
    firstName: "",
    lastName: "",
    university: "",
    avatar: "",
  });

  // Preferences editable state
  const [prefState, setPrefState] = useState({
    emailUpdates: true,
    pushNotifications: false,
    reminderTime: 30 as 15 | 30 | 60,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Security tab state
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [securityErrors, setSecurityErrors] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Avatar upload handling
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = getAccessToken();
        if (!token) {
          setError("No access token found. Please log in again.");
          setLoading(false);
          return;
        }

        const response = await api.get('/auth/me');
        
        if (response.data?.success && response.data?.data?.user) {
          const userData = mapApiUserToUserProfile(response.data.data.user);
          setUser(userData);
          
          // Update editable states with fetched data
          setEditProfile({
            firstName: userData.firstName,
            lastName: userData.lastName,
            university: userData.university,
            avatar: userData.avatar || "",
          });
          
          setPrefState({
            emailUpdates: userData.preferences.emailUpdates,
            pushNotifications: userData.preferences.pushNotifications,
            reminderTime: userData.preferences.reminderTime,
          });
        } else {
          setError("Failed to load profile data.");
        }
      } catch (err: any) {
        console.error("Error fetching user profile:", err);
        setError(err.response?.data?.message || "Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  // Placeholder avatar upload logic
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, use FileReader to preview locally
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfile((prev) => ({
          ...prev,
          avatar: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
      // TODO: integrate uploadAvatar API here
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No access token found. Please log in again.");
        setSaving(false);
        return;
      }

      // Call API to update profile
      const response = await api.put('/auth/me', {
        firstName: editProfile.firstName,
        lastName: editProfile.lastName,
        university: editProfile.university,
        avatar: editProfile.avatar,
      });

      if (response.data?.success && response.data?.data?.user) {
        const userData = mapApiUserToUserProfile(response.data.data.user);
        setUser(userData);
        
        // Update editable state with the response data
        setEditProfile({
          firstName: userData.firstName,
          lastName: userData.lastName,
          university: userData.university,
          avatar: userData.avatar || "",
        });
      }
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.response?.data?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Preferences handlers
  const handlePrefToggle = (key: "emailUpdates" | "pushNotifications") => {
    setPrefState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleReminderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrefState((prev) => ({
      ...prev,
      reminderTime: Number(e.target.value) as 15 | 30 | 60,
    }));
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No access token found. Please log in again.");
        setSavingPrefs(false);
        return;
      }

      // Call API to update preferences (send as notificationPreferences if that's what backend expects)
      const response = await api.put('/auth/me', {
        notificationPreferences: {
          emailUpdates: prefState.emailUpdates,
          pushNotifications: prefState.pushNotifications,
          reminderTime: prefState.reminderTime,
        },
      });

      if (response.data?.success && response.data?.data?.user) {
        const userData = mapApiUserToUserProfile(response.data.data.user);
        setUser(userData);
        
        // Update preferences state with the response data
        setPrefState({
          emailUpdates: userData.preferences.emailUpdates,
          pushNotifications: userData.preferences.pushNotifications,
          reminderTime: userData.preferences.reminderTime,
        });
      }
    } catch (err: any) {
      console.error("Error saving preferences:", err);
      setError(err.response?.data?.message || "Failed to save preferences. Please try again.");
    } finally {
      setSavingPrefs(false);
    }
  };

  // Security password fields and handlers
  const handleSecurityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordState((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSecurityErrors(null);
    setSecuritySuccess(null);
  };

  // --- API submit handler for password change ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErrors(null);
    setSecuritySuccess(null);
    const { currentPassword, newPassword, confirmNewPassword } = passwordState;

    // Validation: Ensure all fields present
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setSecurityErrors("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setSecurityErrors("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setSecurityErrors("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);

    try {
      const token = getAccessToken();
      if (!token) {
        setSecurityErrors("No access token found. Please log in again.");
        setUpdatingPassword(false);
        return;
      }

      // Call password change API
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data?.success) {
        setSecuritySuccess(response.data.message || "Password changed successfully. Please login again with your new password.");
        setPasswordState({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      }
    } catch (error: any) {
      console.error("[Password Update] Error:", error);
      
      // Handle error response with errors array
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors
          .map((err: any) => err.message || "Unknown error")
          .join(". ");
        setSecurityErrors(errorMessages);
      } else if (error.response?.data?.message) {
        setSecurityErrors(error.response.data.message);
      } else {
        setSecurityErrors("Failed to change password. Please try again.");
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-4">
          Account Settings
        </h1>
        <div className="bg-white rounded-xl shadow p-8 min-h-[16rem] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !user) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-4">
          Account Settings
        </h1>
        <div className="bg-white rounded-xl shadow p-8 min-h-[16rem] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no user data, don't render
  if (!user) {
    return null;
  }

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto space-y-8">
      {/* Error message banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <h1 className="text-3xl font-semibold text-gray-900 mb-4">
        Account Settings
      </h1>

      {/* Tabs */}
      <nav className="flex space-x-4 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 -mb-px font-medium border-b-2 transition-colors duration-150 ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-primary"
            }`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content Card */}
      <div className="bg-white rounded-xl shadow p-8 min-h-[16rem]">
        {/* Profile Card Header: Avatar + Name + Email */}
        <div className="flex items-center gap-5 mb-8">
          {/* <div className="relative w-20 h-20">
            <img
              src={editProfile.avatar}
              alt="User avatar"
              className="w-20 h-20 rounded-full shadow object-cover"
            /> */}
            
            {/* Camera overlay */}
            {/* <button
              type="button"
              aria-label="Edit avatar"
              className="absolute right-1 bottom-1 bg-primary rounded-full p-1 shadow-md border-2 border-white hover:bg-primary/90 transition"
              onClick={handleAvatarClick}
              tabIndex={0}
            >
              <CameraIcon />
            </button> */}
            {/* <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div> */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h2>
            <span className="text-gray-600 text-sm">{user.email}</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={editProfile.firstName}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={editProfile.lastName}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                University
              </label>
              <input
                type="text"
                name="university"
                value={editProfile.university}
                onChange={handleInputChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-primary text-white font-semibold shadow disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

{/*         
        {activeTab === "preferences" && (
          <form className="space-y-6 max-w-md mx-auto py-2" onSubmit={handleSavePreferences}>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Email Notifications
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={prefState.emailUpdates}
                className={`relative inline-flex items-center h-7 rounded-full w-12 transition ${
                  prefState.emailUpdates ? "bg-primary" : "bg-gray-300"
                }`}
                onClick={() => handlePrefToggle("emailUpdates")}
                tabIndex={0}
              >
                <span
                  className={`inline-block w-6 h-6 bg-white rounded-full shadow transform transition ${
                    prefState.emailUpdates ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="ml-3 text-gray-600 text-sm">
                Receive important updates via email
              </span>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Push Notifications
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={prefState.pushNotifications}
                className={`relative inline-flex items-center h-7 rounded-full w-12 transition ${
                  prefState.pushNotifications ? "bg-primary" : "bg-gray-300"
                }`}
                onClick={() => handlePrefToggle("pushNotifications")}
                tabIndex={0}
              >
                <span
                  className={`inline-block w-6 h-6 bg-white rounded-full shadow transform transition ${
                    prefState.pushNotifications ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="ml-3 text-gray-600 text-sm">
                Alerts on your device
              </span>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Reminder Time
              </label>
              <select
                value={prefState.reminderTime}
                onChange={handleReminderChange}
                className="border rounded-lg px-3 py-2 w-40"
              >
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
              </select>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-primary text-white font-semibold shadow disabled:opacity-60"
                disabled={savingPrefs}
              >
                {savingPrefs ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>
        )}
         */}

        {activeTab === "security" && (
          <form
            className="space-y-6 max-w-md mx-auto py-4"
            onSubmit={handleUpdatePassword}
            autoComplete="off"
          >
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordState.currentPassword}
                onChange={handleSecurityInputChange}
                className="w-full border rounded-lg px-3 py-2"
                required
                autoComplete="current-password"
                minLength={1}
                disabled={updatingPassword}
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordState.newPassword}
                onChange={handleSecurityInputChange}
                className="w-full border rounded-lg px-3 py-2"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={updatingPassword}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters.
              </p>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmNewPassword"
                value={passwordState.confirmNewPassword}
                onChange={handleSecurityInputChange}
                className="w-full border rounded-lg px-3 py-2"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={updatingPassword}
              />
            </div>
            {securityErrors && (
              <div className="text-red-600 text-sm text-center">{securityErrors}</div>
            )}
            {securitySuccess && (
              <div className="text-green-600 text-sm text-center">{securitySuccess}</div>
            )}
            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-primary text-white font-semibold shadow disabled:opacity-60 flex items-center justify-center gap-2"
                disabled={updatingPassword}
              >
                {updatingPassword && (
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 mr-2 text-white animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                )}
                {updatingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
