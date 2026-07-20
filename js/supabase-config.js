const SUPABASE_URL = "https://injsroyfyknhfetiibkl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_dDfNw9wpPb1CWzysP25tpA_jbpKBlsx";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
