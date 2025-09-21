import { createClient } from "@supabase/supabase-js"

// 👇 Replace with your own from Supabase dashboard
const supabaseUrl = "https://bnjcwhnapqfwdqfrobzn.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuamN3aG5hcHFmd2RxZnJvYnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0Mzc0NDksImV4cCI6MjA3NDAxMzQ0OX0.PN1IfxN_cpYVokont55ZTIrmGSEglB4FL0sj2pf9gZ8"

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,   // 👈 keeps you logged in
    autoRefreshToken: true, // 👈 refreshes expired tokens
  },
})