"use client";

import { useState } from "react";
import axios from "axios";

import { useRouter } from "next/navigation";
export default function Auth(){
  const [username, setUsername] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("")
  const [name, setName] = useState("");
  const [password, setPass] = useState('')
  const [register_mode, setMode] = useState(null)
  const router = useRouter();
 const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await axios.post(
  "http://localhost:5000/api/login",
  { username, password },
  { withCredentials: true }
);
      setMessage(response.data.message || "Signed in successfully");
      console.log("Login success:", response.data);
      router.push(`/users/${response.data.user.id}`);
    } catch (error: any) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.details ||
          "Sign in failed"
      );
        console.error("Full Axios error:", error);
        console.error("Backend response:", error.response?.data);
    }
  };

 const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:5000/api/users", {
        name,
        email,
        username: signupUsername,
        password: signupPassword,
      });

      setMessage(response.data.message || "Account created successfully");
      console.log("Signup success:", response.data);
    } catch (error: any) {
      console.error(error)
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.details ||
          "Sign up failed"
      );
    }
  };



  return(

<main className="form-page">
  <div className="default-bg" />
  <div className="default-overlay" />

  <section className="form-content">
    <header className="form-header">
      <h1 className="form-title">Todd&apos;s Time</h1>
    </header>

    <div className="form-center">
      <div className="form-grid">
<form
  className="form-form"
  onSubmit={(e) => {
    setMode(0);
    handleLogin(e);
  }}
>
          <h1 className="form-form-title">Login</h1>

          <div className="form-field">
            <label className="form-label" htmlFor="login-username">
              Username
            </label>
            <input className="form-input" id="login-username" type="text"

              value={username}
              onChange={(e) => setUsername(e.target.value)}
                />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="login-password"

                >
              Password
            </label>
            <input className="form-input" id="login-password" type="password" 

              value={password}
              onChange={(e) => setPass(e.target.value)}

                />
            <p className="form-error">Please choose a password.</p>
          </div>

          <div className="form-button-group">
        <button className="form-button" type="submit">
              Sign In
            </button>

            <button className="form-button" type="button">
              Forgot Password
            </button>
          </div>
        </form>

      </div>
    </div>
  </section>
</main>
  );


}
