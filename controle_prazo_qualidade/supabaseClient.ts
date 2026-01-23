import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gjlpxckobyemuifqnoee.supabase.co').trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqbHB4Y2tvYnllbXVpZnFub2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODcyOTEsImV4cCI6MjA3OTA2MzI5MX0.TxvbLLDSVS576fghjyINr0jvvsW-Q1LIGCg-aOJX95o').trim();

export const supabase = createClient(supabaseUrl, supabaseKey);