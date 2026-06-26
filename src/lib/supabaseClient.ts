import { createClient } from "@supabase/supabase-js";

const fallbackUrl = "https://difljtvindmqjqiaunon.supabase.co";
const fallbackKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmxqdHZpbmRtcWpxaWF1bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTkzNzksImV4cCI6MjA5NTI5NTM3OX0.EXnJEaq9eT3vc67y7kaDD7tsInwzSZtdXDs9RN6GBIg";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== "undefined"
  ? process.env.NEXT_PUBLIC_SUPABASE_URL 
  : fallbackUrl;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "undefined"
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  : fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isRealSupabaseActive = true;
