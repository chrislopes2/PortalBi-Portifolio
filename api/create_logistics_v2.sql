CREATE TABLE IF NOT EXISTS public.logistics_branches (
    branch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.logistics_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.logistics_inventory (
    inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.logistics_branches(branch_id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.logistics_items(item_id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logistics_freights (
    freight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_created TIMESTAMPTZ NOT NULL,
    origin_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    distance_km NUMERIC(10, 2) NOT NULL,
    duration_hours NUMERIC(10, 2) NOT NULL,
    vehicle_type TEXT NOT NULL
);

ALTER TABLE public.logistics_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_freights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura_publica_branches" ON public.logistics_branches FOR SELECT USING (true);
CREATE POLICY "Leitura_publica_items" ON public.logistics_items FOR SELECT USING (true);
CREATE POLICY "Leitura_publica_inventory" ON public.logistics_inventory FOR SELECT USING (true);
CREATE POLICY "Leitura_publica_freights" ON public.logistics_freights FOR SELECT USING (true);

CREATE POLICY "Acesso_total_branches" ON public.logistics_branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso_total_items" ON public.logistics_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso_total_inventory" ON public.logistics_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso_total_freights" ON public.logistics_freights FOR ALL USING (true) WITH CHECK (true);
