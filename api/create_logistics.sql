CREATE TABLE IF NOT EXISTS public.logistics_customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.logistics_carriers (
    carrier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    sla_target_percent NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS public.logistics_orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.logistics_customers(customer_id) ON DELETE CASCADE,
    carrier_id UUID REFERENCES public.logistics_carriers(carrier_id) ON DELETE SET NULL,
    order_status TEXT NOT NULL,
    purchase_timestamp TIMESTAMPTZ NOT NULL,
    estimated_delivery_date TIMESTAMPTZ NOT NULL,
    actual_delivery_date TIMESTAMPTZ,
    freight_value NUMERIC(10, 2) NOT NULL,
    package_weight_kg NUMERIC(10, 2) NOT NULL
);

ALTER TABLE public.logistics_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública clientes" ON public.logistics_customers FOR SELECT USING (true);
CREATE POLICY "Leitura pública transportadoras" ON public.logistics_carriers FOR SELECT USING (true);
CREATE POLICY "Leitura pública pedidos" ON public.logistics_orders FOR SELECT USING (true);

CREATE POLICY "Acesso total clientes para serviço" ON public.logistics_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total transportadoras para serviço" ON public.logistics_carriers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total pedidos para serviço" ON public.logistics_orders FOR ALL USING (true) WITH CHECK (true);
