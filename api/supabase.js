const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tnbxmrathdctzkadekqa.supabase.co';
const supabaseKey = 'sb_publishable_kn_1d-Ttr0m8pfJ_Vytnlg_YzpnQvCS';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
