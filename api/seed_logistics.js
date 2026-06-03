const supabase = require('./supabase');

// ============================================================================
// LOGISTICS SEEDER - Gerador de Dados Falsos para o Portfólio
// ============================================================================

// Utilitários de geração aleatória
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

// Dados base para simulação
const CITIES = [
    { city: 'São Paulo', state: 'SP', zips: ['01000-000', '02000-000', '03000-000'] },
    { city: 'Rio de Janeiro', state: 'RJ', zips: ['20000-000', '21000-000', '22000-000'] },
    { city: 'Belo Horizonte', state: 'MG', zips: ['30000-000', '31000-000'] },
    { city: 'Curitiba', state: 'PR', zips: ['80000-000', '81000-000'] },
    { city: 'Porto Alegre', state: 'RS', zips: ['90000-000', '91000-000'] },
    { city: 'Salvador', state: 'BA', zips: ['40000-000'] },
    { city: 'Recife', state: 'PE', zips: ['50000-000'] }
];

const CARRIERS_DATA = [
    { name: 'Loggi Fast', vehicle_type: 'Van', sla_target_percent: 95.0 },
    { name: 'Total Express', vehicle_type: 'Caminhão', sla_target_percent: 92.5 },
    { name: 'Correios Sedex', vehicle_type: 'Van', sla_target_percent: 90.0 },
    { name: 'Jadlog Premium', vehicle_type: 'Caminhão', sla_target_percent: 96.5 },
    { name: 'Motoboy Local', vehicle_type: 'Moto', sla_target_percent: 98.0 }
];

async function seedDatabase() {
    console.log('📦 Iniciando o processo de Seed de Logística...');

    // 1. Criar Transportadoras
    console.log('Inserindo Transportadoras...');
    const { data: carriers, error: errCarriers } = await supabase
        .from('logistics_carriers')
        .insert(CARRIERS_DATA)
        .select();
    
    if (errCarriers) {
        console.error('Erro ao inserir transportadoras:', errCarriers.message);
        return;
    }

    // 2. Criar Clientes Falsos
    console.log('Criando 50 clientes fictícios...');
    const customersToInsert = [];
    for (let i = 1; i <= 50; i++) {
        const loc = pickRandom(CITIES);
        customersToInsert.push({
            name: `Cliente Corporate ${i}`,
            zip_code: pickRandom(loc.zips),
            city: loc.city,
            state: loc.state
        });
    }

    const { data: customers, error: errCustomers } = await supabase
        .from('logistics_customers')
        .insert(customersToInsert)
        .select();
    
    if (errCustomers) {
        console.error('Erro ao inserir clientes:', errCustomers.message);
        return;
    }

    // 3. Gerar Pedidos e Entregas (O Coração do Dashboard)
    console.log('Gerando 1500 entregas (Olist style)... Isso pode levar alguns segundos.');
    const ordersToInsert = [];
    const baseDate = new Date('2025-01-01T10:00:00Z');

    for (let i = 1; i <= 1500; i++) {
        const customer = pickRandom(customers);
        const carrier = pickRandom(carriers);
        
        // Simular datas de compra ao longo do ano
        const purchaseDate = addDays(baseDate, randomInt(0, 360));
        purchaseDate.setHours(randomInt(8, 20), randomInt(0, 59), 0);

        // Prazo de entrega prometido (SLA): de 2 a 10 dias
        const slaDays = randomInt(2, 10);
        const estimatedDelivery = addDays(purchaseDate, slaDays);

        // Qual o status do pedido?
        // 80% entregue no prazo, 10% entregue atrasado, 5% em rota, 5% extraviado/devolvido
        const rand = Math.random();
        let status = 'entregue';
        let actualDelivery = null;

        if (rand < 0.8) {
            // Entregue no prazo (antes ou exatamente no dia do SLA)
            status = 'entregue';
            actualDelivery = addDays(purchaseDate, randomInt(1, slaDays));
        } else if (rand < 0.9) {
            // Entregue ATRASADO
            status = 'atrasado';
            actualDelivery = addDays(estimatedDelivery, randomInt(1, 5));
        } else if (rand < 0.95) {
            status = 'em_rota';
        } else {
            status = 'extraviado';
        }

        // Regra de frete: varia com peso e transportadora
        const weightKg = randomFloat(0.5, 50.0);
        let freightValue = weightKg * 1.5 + randomFloat(10, 50);
        if (carrier.vehicle_type === 'Moto' && weightKg > 5) freightValue += 20; // penalidade de peso

        ordersToInsert.push({
            customer_id: customer.customer_id,
            carrier_id: carrier.carrier_id,
            order_status: status,
            purchase_timestamp: purchaseDate.toISOString(),
            estimated_delivery_date: estimatedDelivery.toISOString(),
            actual_delivery_date: actualDelivery ? actualDelivery.toISOString() : null,
            freight_value: freightValue,
            package_weight_kg: weightKg
        });
    }

    // Inserir em lotes de 500 para não estourar payload do Supabase
    const chunkSize = 500;
    for (let i = 0; i < ordersToInsert.length; i += chunkSize) {
        const chunk = ordersToInsert.slice(i, i + chunkSize);
        console.log(`Inserindo lote de entregas ${i} até ${i + chunk.length}...`);
        const { error: errOrders } = await supabase.from('logistics_orders').insert(chunk);
        if (errOrders) {
            console.error('Erro ao inserir pedidos:', errOrders.message);
        }
    }

    console.log('✅ Base de Logística gerada com sucesso! Você já pode conectar o Power BI ao Supabase.');
}

seedDatabase();
