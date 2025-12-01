const supabaseUrl = 'https://evqykmpnlfwwcxlqkmdg.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cXlrbXBubGZ3d2N4bHFrbWRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5MDkwOCwiZXhwIjoyMDc1MzY2OTA4fQ.Lrbp5Sr9q5LW1HV_UucoSbLeUhUlQAHMMPuCsNAGYWg'; 
const clientInstance = supabase.createClient(supabaseUrl, supabaseAnonKey);
export { clientInstance as supabase };