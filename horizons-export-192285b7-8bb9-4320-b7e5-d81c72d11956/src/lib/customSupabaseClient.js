import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btnmnnmryxpfaeiwtsqb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bm1ubm1yeXhwZmFlaXd0c3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg1OTgsImV4cCI6MjA4MTU0NDU5OH0.CjOtpBIAw3QCN9M3_Fly5Sm3m020hpNRRJqbmL89-r4';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
