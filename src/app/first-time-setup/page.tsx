"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import API_BASE_URL from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function FirstTimeSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're in first-time setup mode
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/first-time-setup-required`);
        if (!response.data.first_time_setup_required) {
          // If not first time setup, redirect to login page
          router.push("/auth");
        }
      } catch (error) {
        console.error("Error checking setup status", error);
      }
    };

    checkSetupStatus();
  }, [router]);

  const handleSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/first-time-setup`, {
        name,
        username,
        password,
        confirmPassword,
        email
      }, { withCredentials: true });

      setMessageType("success");
      setMessage("First-time setup completed successfully!");
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
    } catch (error: unknown) {
      const responseData = axios.isAxiosError(error) ? error.response?.data : null;
      setMessageType("error");
      setMessage(
        responseData?.error ||
          "First-time setup failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-shell__glow auth-shell__glow--left" />
      <div className="auth-shell__glow auth-shell__glow--right" />
      <div className="auth-topbar">
        <ThemeToggle />
      </div>
      <div className="auth-stage auth-stage--compact">
        <header className="auth-hero">
          <p className="auth-kicker">Initial Setup</p>
          <h1 className="auth-title">Todd&apos;s Times</h1>
          <p className="auth-subtitle">Create the first administrator account and open the deck.</p>
        </header>

        <div className="auth-card auth-card--single">
          <h2 className="auth-card__title">
            First-Time Setup
          </h2>

          {message && (
            <div className={`auth-notice ${
              messageType === "success"
                ? "auth-notice--success"
                : "auth-notice--error"
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSetup} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="setup-name" className="auth-label">
                Full Name
              </label>
              <input
                id="setup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="setup-username" className="auth-label">
                Username
              </label>
              <input
                id="setup-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="setup-email" className="auth-label">
                Email
              </label>
              <input
                id="setup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="setup-password" className="auth-label">
                Password
              </label>
                <input
                  id="setup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="setup-confirm-password" className="auth-label">
                  Confirm Password
                </label>
                <input
                  id="setup-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                />
              </div>

              <button
              type="submit" 
              disabled={isLoading}
              className="btn btn-solid-light mt-2 w-full"
            >
              {isLoading ? "Setting up..." : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
