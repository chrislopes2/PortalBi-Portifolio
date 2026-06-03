const supabase = require('./supabase');

// ============================================================================
// LOGISTICS SEEDER V2 - Estoque e Custos de Frete (What-if Diesel)
// ============================================================================

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

// Cidades para Rotas e Filiais
const CITIES = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Goiânia', 'Brasília', 'Campinas'];

const ITEMS_DATA = [
    { sku: 'ITM-001', name: 'Notebook Pro 15"', category: 'Eletrônicos', unit_cost: 4500.00 },
    { sku: 'ITM-002', name: 'Smartphone Z', category: 'Eletrônicos', unit_cost: 2800.00 },
    { sku: 'ITM-003', name: 'Monitor Ultrawide', category: 'Periféricos', unit_cost: 1200.00 },
    { sku: 'ITM-004', name: 'Cadeira Ergonômica', category: 'Móveis', unit_cost: 850.00 },
    { sku: 'ITM-005', name: 'Mesa de Escritório', category: 'Móveis', unit_cost: 600.00 },
    { sku: 'ITM-006', name: 'Teclado Mecânico', category: 'Periféricos', unit_cost: 350.00 }
];

async function seedDatabaseV2() {
    console.log('📦 Iniciando o processo de Seed V2 (Estoque e Fretes)...');

    // 1. Criar Filiais
    console.log('Inserindo Filiais...');
    const branchesToInsert = [
        { name: 'CD Matriz Sudeste', city: 'São Paulo', state: 'SP' },
        { name: 'CD Nordeste', city: 'Recife', state: 'PE' },
        { name: 'CD Sul', city: 'Curitiba', state: 'PR' }
    ];
    
    const { data: branches, error: errBranches } = await supabase
        .from('logistics_branches')
        .insert(branchesToInsert)
        .select();
    
    if (errBranches) {
        console.error('Erro filiais:', errBranches.message); return;
    }

    // 2. Criar Itens (Produtos)
    console.log('Inserindo Produtos do Estoque...');
    const { data: items, error: errItems } = await supabase
        .from('logistics_items')
        .insert(ITEMS_DATA)
        .select();

    if (errItems) {
        console.error('Erro itens:', errItems.message); return;
    }

    // 3. Gerar Estoque Físico
    console.log('Distribuindo estoque entre as filiais...');
    const inventoryToInsert = [];
    for (const branch of branches) {
        for (const item of items) {
            inventoryToInsert.push({
                branch_id: branch.branch_id,
                item_id: item.item_id,
                quantity: randomInt(50, 1500)
            });
        }
    }

    const { error: errInv } = await supabase.from('logistics_inventory').insert(inventoryToInsert);
    if (errInv) { console.error('Erro estoque:', errInv.message); }

    // 4. Gerar Histórico de Fretes (Para o cálculo de Diesel)
    console.log('Gerando 1200 viagens de frete...');
    const freightsToInsert = [];
    const baseDate = new Date('2025-01-01T08:00:00Z');

    for (let i = 1; i <= 1200; i++) {
        let origin = pickRandom(CITIES);
        let dest = pickRandom(CITIES);
        while (origin === dest) dest = pickRandom(CITIES); // Garante que a origem seja diferente do destino

        // Distância aleatória razoável entre 100km e 2500km
        const distKm = randomFloat(100, 2500);
        
        // Caminhão anda em média 60km/h na rodovia
        const durationHr = distKm / 60.0;

        freightsToInsert.push({
            date_created: addDays(baseDate, randomInt(0, 360)).toISOString(),
            origin_city: origin,
            destination_city: dest,
            distance_km: distKm,
            duration_hours: durationHr,
            vehicle_type: pickRandom(['Caminhão Leve', 'Carreta', 'Furgão'])
        });
    }

    // Inserir fretes em lotes
    for (let i = 0; i < freightsToInsert.length; i += 400) {
        const chunk = freightsToInsert.slice(i, i + 400);
        await supabase.from('logistics_freights').insert(chunk);
    }

    console.log('✅ Base de Estoque e Frete (V2) gerada com sucesso!');
}

seedDatabaseV2();
