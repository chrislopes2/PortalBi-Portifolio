const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tnbxmrathdctzkadekqa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnhtcmF0aGRjdHprYWRla3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk5NDIyOSwiZXhwIjoyMDkyNTcwMjI5fQ.yOcU3ruc19Mg4bMnkbENxfWLRg6YHda-qnx-kCdjGAA';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
