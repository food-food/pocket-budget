/* supabase.js — Supabase client init */
'use strict';

(function () {
  const SUPABASE_URL = 'https://lowdcpuzldwwmjtnrfzm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvd2RjcHV6bGR3d21qdG5yZnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDc2NTMsImV4cCI6MjA5NjE4MzY1M30.U2JlXTHV4eVZZAtZzi9oCC1Npo2kv1txKa_M-tdzbcw';
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
