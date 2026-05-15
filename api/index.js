const supabase = require('./supabase');

module.exports = async (req, res) => {
  const url = req.url || '';
  
  // Headers CORS para o Power BI
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ── ROTA: PING ──────────────────────────────────────────────
    if (url.includes('/api/ping')) {
      return res.status(200).json({ status: 'ok', source: 'monolith' });
    }

    // ── ROTA: EXPORT ────────────────────────────────────────────
    if (url.includes('/api/export')) {
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
      const area = searchParams.get('area') || '';

      const { data, error } = await supabase
        .from('operacional_jobs')
        .select('job, area, cliente, cnpj, status')
        .ilike('area', `%${area}%`);

      if (error) throw error;

      const headers = ['Job', 'Area', 'Cliente', 'CNPJ', 'Status'];
      const rows = (data || []).map(r => [r.job, r.area, r.cliente, r.cnpj, r.status]);
      
      const csvContent = "\uFEFF" + [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Export_${area || 'Geral'}.csv"`);
      return res.status(200).send(csvContent);
    }

    // ── ROTA: LOGIN (Básico para o PortalBi) ──────────────────────
    if (url.includes('/api/login') && req.method === 'POST') {
      const { email, password } = req.body || {};
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (error || !data) return res.status(401).json({ success: false, message: 'Incorreto' });

      // Buscar dashboards permitidos (simplificado)
      const { data: dashboards } = await supabase.from('dashboards').select('*');

      return res.status(200).json({ 
        success: true, 
        user: { id: data.id, email: data.email, name: data.name, isAdmin: data.is_admin, area: data.area },
        dashboards: dashboards || []
      });
    }

    return res.status(404).json({ error: 'Not Found' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
};
