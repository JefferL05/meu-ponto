# Meu Ponto 3.0

Controle pessoal de jornada em Astro estático + JS. Offline com pré-cache; nuvem Supabase opcional com revisão por conta.

## Rodar

    npm ci
    npm test
    npm run dev       # copie .env.example para .env para testar a nuvem
    npm run build && npm run preview

## O que mudou da 2.1

- Múltiplos empregos, cada um com registros, regras e banco próprios.
- Motor novo (`src/lib/jornada.js`): turnos noturnos com “dia seguinte”, ciclos 12x36/24x48 e personalizados, tolerância, arredondamento, adicional noturno e avisos de descanso.
- Validação impede sobreposição, inclusive entre dias; jornada limitada a 24h; dias fora do controle não geram débito.
- Férias, folgas, feriados, abonos e faltas por período; destino banco 1:1 ou pagamento estimado por dia; ajustes manuais do banco.
- Histórico mensal com busca, relatórios com totais/por marcador, CSV com proteção contra fórmulas e impressão/PDF.
- Lixeira com restauração conflitante preservada; backup JSON versionado com validação e cópia anterior guardada.
- Sincronização por conta com revisão atômica (`supabase.sql`): conflito exige escolha explícita; sair volta ao perfil local sem vazar dados entre contas.
- Inventário estático do app de referência em `docs/inventario-aot.json` (473 caminhos Dart, 1559 chaves pt-BR). Textos do outro app descrevem recursos; cálculos do Meu Ponto são implementação própria e testada.

## Supabase (uma vez)

1. Crie um projeto em supabase.com.
2. SQL Editor: rode o conteúdo de `supabase.sql` (cria `revisao` e a função `salvar_meu_ponto`).
3. Authentication → Sign In / Providers: deixe "Email" ligado.
4. Authentication → URL Configuration: Site URL e Redirect URLs = `https://SEU-USUARIO.github.io/SEU-REPO/` (e `http://localhost:4321/` para testes).
5. Project Settings → API: copie a URL e a chave **anon** (nunca a service_role).

## GitHub Pages

1. Envie o código (branch `main`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → aba **Variables**: crie `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY`.
4. O workflow (`node: 24`, `npm ci`, `npm test`, `npm run build`) publica `dist/` a cada push.

## Como a sincronização funciona

Dados sempre locais primeiro. Logado, cada perfil de conta tem sua revisão na nuvem: escrita só avança se a revisão esperada coincidir (função `salvar_meu_ponto`). Se outro aparelho gravou antes, a tela pede escolha explícita entre “usar este aparelho” e “usar nuvem”, com backup da cópia substituída. Sem login, nada é enviado.
