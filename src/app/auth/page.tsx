"use client";

import { useState } from "react";
import axios from "axios";

export default function Auth(){
  const [username, setUsername] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("")
  const [name, setName] = useState("");
  const [password, setPass] = useState(null)
  const [register_mode, setMode] = useState(null)

 const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });

      setMessage(response.data.message || "Signed in successfully");
      console.log("Login success:", response.data);
    } catch (error: any) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.details ||
          "Sign in failed"
      );
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

              onChange={(e) => setUsername(e.target.value)}
                />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="login-password"

                >
              Password
            </label>
            <input className="form-input" id="login-password" type="password" 

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

<form
  className="form-form"
  onSubmit={(e) => {
    handleSignup(e);
  }}
>
          <h1 className="form-form-title">Sign-up</h1>

          <div className="form-field">
            <label className="form-label" htmlFor="login-username">

             Name 
            </label>
<input
  className="form-input"
  id="signup-name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="login-username">
             Email 
            </label>
            <input className="form-input"
            value={email}

                  id="login-username" type="text"

              onChange={(e) => setEmail(e.target.value)}
                />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="login-username">
             Username 
            </label>
            <input 

            value={signupUsername}

                  className="form-input" id="login-username" type="text"

              onChange={(e) => setSignupUsername(e.target.value)}
                />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="login-password">

              Password
            </label>
            <input 

            value={signupPassword}

                  className="form-input" id="login-password" type="password" 

              onChange={(e) => setSignupPassword(e.target.value)}
                />
            <p className="form-error">Please choose a password.</p>
          </div>

          <div className="form-button-group">
          <button className="form-button" type="submit">
              Sign Up
            </button>

          </div>
        </form>
      </div>
    </div>
  </section>
</main>
  );


}
