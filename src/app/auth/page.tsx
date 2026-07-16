"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient, { API_BASE_URL, setCsrfToken, refreshCsrfToken } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function Auth(){
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("")
  const [name, setName] = useState("");
  const [password, setPass] = useState('')
  const [messageType, setMessageType] = useState<"success" | "error">("success")
  const [isLoading, setIsLoading] = useState(false)

  // Check setup status and fetch CSRF token on component mount
  useEffect(() => {
    refreshCsrfToken();
    const checkSetupStatus = async () => {
      try {
        const response = await apiClient.get(`${API_BASE_URL}/api/first-time-setup-required`);
        if (response.data.first_time_setup_required) {
          router.push("/first-time-setup");
        }
      } catch (error) {
        console.error("Error checking setup status", error);
      }
    };

    checkSetupStatus();
  }, [router]);

  const sanitizeTextInput = (input: string): string =>
    input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("")

    try {
      const sanitizedUsername = sanitizeTextInput(username);
      
      const response = await apiClient.post(`${API_BASE_URL}/api/login`, {
        username: sanitizedUsername,
        password,
      });

      if (response.data.csrf_token) {
        setCsrfToken(response.data.csrf_token);
      }

      setMessageType("success")
      setMessage(response.data.message || "Signed in successfully");
      
      if (response.data.redirect) {
        router.push("/first-time-setup");
        return;
      }
      
      router.push(`/users/${response.data.user.public_id}`);
    } catch (error: unknown) {
      const responseData = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: Record<string, string> } }).response?.data
        : null;
      setMessageType("error")
      setMessage(
        responseData?.error || responseData?.details || "Sign in failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("")

    if (signupPassword !== signupConfirmPassword) {
      setMessageType("error")
      setMessage("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const sanitizedName = sanitizeTextInput(name);
      const sanitizedEmail = sanitizeTextInput(email);
      const sanitizedSignupUsername = sanitizeTextInput(signupUsername);
      
      const response = await apiClient.post(`${API_BASE_URL}/api/create_user`, {
        name: sanitizedName,
        email: sanitizedEmail,
        username: sanitizedSignupUsername,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });

      setMessageType("success")
      setMessage(response.data.message || "Account created successfully");
    } catch (error: unknown) {
      const responseData = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: Record<string, string> } }).response?.data
        : null;
      setMessageType("error")
      setMessage(
        responseData?.error || responseData?.details || "Sign up failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return(
    <main className="auth-shell">
      <div className="auth-shell__glow auth-shell__glow--left" />
      <div className="auth-shell__glow auth-shell__glow--right" />
      <div className="auth-topbar">
        <ThemeToggle />
      </div>
      <div className="auth-stage">
        <header className="auth-hero">
          <p className="auth-kicker">Private News Desk</p>
          <h1 className="auth-title">Todd&apos;s Times</h1>
          <p className="auth-subtitle">Curated feeds, clean reading, controlled access.</p>
        </header>

        {message && (
          <div className={`auth-notice ${
            messageType === "success"
              ? "auth-notice--success"
              : "auth-notice--error"
          }`}>
            {message}
          </div>
        )}

        <div className="auth-grid">
          <section className="auth-card">
            <h2 className="auth-card__title">
              Sign In
            </h2>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="login-username" className="auth-label">
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="login-password" className="auth-label">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPass(e.target.value)}
                  className="auth-input"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-solid-light mt-2 w-full">
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </section>

          <section className="auth-card">
            <h2 className="auth-card__title">
              Sign Up
            </h2>

            <form onSubmit={handleSignup} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="signup-name" className="auth-label">
                  Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="signup-email" className="auth-label">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="signup-username" className="auth-label">
                  Username
                </label>
                <input
                  id="signup-username"
                  type="text"
                  required
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="signup-password" className="auth-label">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="signup-confirm-password" className="auth-label">
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  required
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  className="auth-input"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-solid-light mt-2 w-full">
                {isLoading ? "Creating account..." : "Sign Up"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
