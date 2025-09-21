import { useState } from "react"
import { supabase } from "./supabaseClient"

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage("✅ Check your email for the login link!")
    }
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h2>Noble Ventures - Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />
        <button type="submit" style={{ padding: "10px 20px" }}>
          Login
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}