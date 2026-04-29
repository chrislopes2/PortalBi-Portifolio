/**
 * ETL Financeiro - PortalBi
 * Busca cotações na API Brapi e gera dados sintéticos de fluxo de caixa/transações.
 */

const supabase = require('./supabase');

// Configurações
const TICKERS = ['PETR4', 'VALE3', 'ITUB4', 'HGLG11', 'KNRI11'];
const BAPI_TOKEN = process.env.BRAPI_TOKEN || ''; // Opcional se a rota for pública com limite

async function main() {
    console.log('🚀 Iniciando ETL Financeiro...');

    try {
        // 1. Garantir que os ativos estão cadastrados na dimensão
        await popularDimensoes();

        // 2. Buscar cotações na Brapi
        console.log('\n📊 Buscando cotações na Brapi...');
        const cotacoes = await buscarCotacoesBrapi();

        // 3. Salvar cotações no Supabase
        if (cotacoes && cotacoes.length > 0) {
            console.log(`💾 Salvando ${cotacoes.length} cotações no Supabase...`);
            const { error } = await supabase
                .from('fin_fato_cotacoes')
                .upsert(cotacoes, { onConflict: 'data,ticker' });
            
            if (error) console.error('❌ Erro ao salvar cotações:', error.message);
            else console.log('✅ Cotações salvas com sucesso!');
        }

        // 4. Gerar dados sintéticos de Fluxo de Caixa (se a tabela estiver vazia)
        await gerarFluxoCaixaSintetico();

        // 5. Gerar dados sintéticos de Transações (se a tabela estiver vazia)
        await gerarTransacoesSinteticas();

        console.log('\n🎉 ETL Financeiro concluído com sucesso!');

    } catch (error) {
        console.error('💥 Falha crítica no processo de ETL:', error);
    }
}

async function popularDimensoes() {
    console.log('📁 Verificando dimensões...');
    
    // Ativos
    const ativos = [
        { ticker: 'PETR4', nome: 'Petróleo Brasileiro S.A. - Petrobras', tipo: 'Acao' },
        { ticker: 'VALE3', nome: 'Vale S.A.', tipo: 'Acao' },
        { ticker: 'ITUB4', nome: 'Itaú Unibanco Holding S.A.', tipo: 'Acao' },
        { ticker: 'HGLG11', nome: 'CGHG Logística Fundo Investimento Imobiliário', tipo: 'FII' },
        { ticker: 'KNRI11', nome: 'Kinea Renda Imobiliária FII', tipo: 'FII' }
    ];

    const { error: errAtivos } = await supabase.from('fin_dim_ativos').upsert(ativos);
    if (errAtivos) console.error('Erro ao popular ativos:', errAtivos.message);

    // Contas
    const contas = [
        { id: 1, nome: 'Caixa Operacional' },
        { id: 2, nome: 'Reserva de Oportunidade' },
        { id: 3, nome: 'Carteira de Investimentos' }
    ];

    const { error: errContas } = await supabase.from('fin_dim_contas').upsert(contas);
    if (errContas) console.error('Erro ao popular contas:', errContas.message);
}

async function buscarCotacoesBrapi() {
    const tickersStr = TICKERS.join(',');
    const url = `https://brapi.dev/api/quote/${tickersStr}?token=${BAPI_TOKEN}`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        
        const hoje = new Date().toISOString().split('T')[0];
        
        return (data.results || []).map(item => ({
            data: hoje,
            ticker: item.symbol,
            preco_fechamento: item.regularMarketPrice || 0
        })).filter(c => c.preco_fechamento > 0);

    } catch (err) {
        console.warn('⚠️ Não foi possível obter dados da Brapi (limite excedido ou falta de token). Usando dados mockados para hoje.');
        
        // Mock de fallback realista para hoje
        const hoje = new Date().toISOString().split('T')[0];
        return [
            { data: hoje, ticker: 'PETR4', preco_fechamento: 38.50 },
            { data: hoje, ticker: 'VALE3', preco_fechamento: 62.30 },
            { data: hoje, ticker: 'ITUB4', preco_fechamento: 32.10 },
            { data: hoje, ticker: 'HGLG11', preco_fechamento: 165.00 },
            { data: hoje, ticker: 'KNRI11', preco_fechamento: 158.20 }
        ];
    }
}

async function gerarFluxoCaixaSintetico() {
    // Verificar se já existem dados
    const { count } = await supabase.from('fin_fato_caixa').select('*', { count: 'exact', head: true });
    
    if (count > 0) {
        console.log('ℹ️ Fluxo de caixa já possui dados. Pulando geração sintética.');
        return;
    }

    console.log('💸 Gerando dados de fluxo de caixa históricos (12 meses)...');
    const registros = [];
    const hoje = new Date();

    for (let i = 365; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];

        // Receitas (ex: vendas) ocorrem a cada poucos dias
        if (Math.random() > 0.7) {
            registros.push({
                data: dataStr,
                tipo: 'Receita',
                descricao: 'Recebimento de Clientes',
                valor: parseFloat((Math.random() * 5000 + 1000).toFixed(2))
            });
        }

        // Despesas operacionais (ex: fornecedores, marketing)
        if (Math.random() > 0.8) {
            registros.push({
                data: dataStr,
                tipo: 'Despesa',
                descricao: 'Pagamento Fornecedores',
                valor: parseFloat((Math.random() * 3000 + 500).toFixed(2))
            });
        }

        // Despesas fixas mensais (Aluguel, Salários)
        if (data.getDate() === 5) {
            registros.push({
                data: dataStr,
                tipo: 'Despesa',
                descricao: 'Folha de Pagamento',
                valor: 15000.00
            });
            registros.push({
                data: dataStr,
                tipo: 'Despesa',
                descricao: 'Aluguel Escritório',
                valor: 2500.00
            });
        }
    }

    console.log(`💾 Salvando ${registros.length} registros de caixa...`);
    // Salvar em lotes de 50 para não estourar
    for (let i = 0; i < registros.length; i += 50) {
        const lote = registros.slice(i, i + 50);
        const { error } = await supabase.from('fin_fato_caixa').insert(lote);
        if (error) console.error('Erro ao salvar lote de caixa:', error.message);
    }
    console.log('✅ Fluxo de caixa gerado!');
}

async function gerarTransacoesSinteticas() {
    const { count } = await supabase.from('fin_fato_transacoes').select('*', { count: 'exact', head: true });
    
    if (count > 0) {
        console.log('ℹ️ Transações já possuem dados. Pulando geração sintética.');
        return;
    }

    console.log('📈 Gerando transações de ativos históricas...');
    const registros = [];
    const hoje = new Date();

    // Preços base para simulação
    const precosBase = {
        'PETR4': 30,
        'VALE3': 55,
        'ITUB4': 25,
        'HGLG11': 150,
        'KNRI11': 140
    };

    // Gerar compras nos últimos 6 meses
    for (let i = 180; i > 30; i -= 15) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];

        TICKERS.forEach(ticker => {
            if (Math.random() > 0.5) {
                const qtd = Math.floor(Math.random() * 50 + 10) * 10; // Múltiplos de 10
                const preco = parseFloat((precosBase[ticker] * (1 + (Math.random() * 0.2 - 0.1))).toFixed(2));
                
                registros.push({
                    data: dataStr,
                    ticker: ticker,
                    tipo: 'Compra',
                    quantidade: qtd,
                    preco_unitario: preco
                });
            }
        });
    }

    console.log(`💾 Salvando ${registros.length} transações...`);
    const { error } = await supabase.from('fin_fato_transacoes').insert(registros);
    if (error) console.error('Erro ao salvar transações:', error.message);
    else console.log('✅ Transações geradas!');
}

if (require.main === module) {
    main();
}

module.exports = { main };
