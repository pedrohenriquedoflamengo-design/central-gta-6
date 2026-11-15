# Central GTA 6

Portal independente de fãs de GTA VI, com identidade cinematográfica inspirada em Vice City. Hospedagem principal: https://centralgta6.pages.dev. A produção acompanha `main`; mudanças devem ser revisadas em branch separada antes de integrar.

## Funcionalidades

- Universo, protagonistas, fontes oficiais e trailers.
- Perfis de Lucia e Jason com fotos oficiais e biografias expansíveis, inclusive sem JavaScript.
- Conta Google e apelido público, fórum com tópicos, respostas e proteção de spoilers.
- Denúncias, remoção das próprias publicações e painel administrativo de moderação.
- Catálogo de missões com filtros, guias, rascunhos e publicação administrativa; progresso individual salvo no banco.

A comunidade depende da configuração do cliente Google e do D1. Sem essas configurações, o site informa a indisponibilidade; não há login fictício. O catálogo começa vazio: nenhuma missão ou publicação de teste é inserida no banco real.

## Custo e uso pelo iPhone

O orçamento autorizado é **R$ 0**. Use exclusivamente os planos gratuitos, sem habilitar faturamento, recarga, SMS ou trials temporários. Não há dependência de Firebase/Supabase. O proprietário configura o projeto pelo navegador do iPhone; não precisa instalar ferramentas ou usar terminal.

Leia [Configuração pelo iPhone](docs/CONFIGURACAO-IPHONE.md) para as etapas do Cloudflare/Google, isolamento de prévia e produção e limites gratuitos. As cotas e políticas dos fornecedores continuam aplicáveis; não há garantia de disponibilidade ininterrupta por um ano.

## Estrutura

- `index.html`, `conta.html`, `forum.html`, `missoes.html`, `privacidade.html`: páginas públicas.
- `assets/`: estilos, JavaScript, imagens e ícone.
- `functions/api/[[path]].js`: API no Cloudflare Pages Functions.
- `lib/`: autenticação e estrutura do banco D1.
- `tests/`: cenários automatizados e dados exclusivamente locais.
- `scripts/build.mjs`: gera o artefato de publicação.

As rotas estáticas não invocam Functions. `_routes.json` limita a API a `/api/*`; consultas paginadas evitam baixar todas as conversas de uma vez. Sessões usam cookies HttpOnly/Secure e tokens armazenados somente como hash. A administração é configurada por `ADMIN_GOOGLE_SUB`, nunca concedida ao primeiro visitante.

## Desenvolvimento e publicação

Node.js 22 ou superior:

```sh
npm ci
npm test
npm run build
npm run dev
```

A publicação usa **`npm run build`** e o diretório **`dist`**. Testes, dependências, arquivos de desenvolvimento e credenciais não são copiados para o site. O login usa `GOOGLE_CLIENT_ID`; o D1 deve estar associado com nome `DB`. Configure variáveis no painel do Cloudflare e repita a implantação após alterações. Nunca versione `.dev.vars`, segredos ou credenciais.

`npm run test:cloudflare` valida o Worker compilado e o emulador D1 após o build. Esse teste não acessa produção. `tests/dev-server.js` fornece um servidor local para testes de interface com contas e missões fictícias; nunca deve ser usado como servidor de produção ou enviado como artefato público.

A Netlify antiga pode gerar uma prévia estática via `netlify.toml`; a API desta etapa funciona somente no Cloudflare. Use a prévia do Cloudflare para validar a comunidade.

## Validação

Os testes de servidor cobrem assinatura, audiência, expiração e nonce do login; CSRF; limites de publicação; permissões de remoção e moderação; rascunhos privados; progresso isolado por jogador; paginação; e revogação de sessões.

As novas páginas foram verificadas no Chromium em larguras de 320, 390, 768 e 1440 px. Fluxos locais com contas fictícias cobrem apelido, tópicos, respostas, denúncias, administração, missões e progresso. O restante do portal também foi verificado em 820, 1024 e 1920 px e em orientação paisagem nas rodadas anteriores.

A autorização real Google e o Safari/iOS em aparelho físico precisam ser validados depois da configuração do proprietário. A expiração de sete dias do cookie é da sessão do jogador, não um período de teste do serviço.

## Conteúdo e imagens

Perfis resumidos a partir da [apresentação oficial de pessoas e lugares](https://www.rockstargames.com/VI/only-in-leonida). Fotos pertencem à Rockstar Games; créditos visíveis na seção de personagens.

- Lucia: https://www.rockstargames.com/VI/_next/static/media/mobile.01e24lvhdu677.jpg
- Jason: https://www.rockstargames.com/VI/_next/static/media/mobile.0jzys13fkqnae.jpg

Missões publicadas exigem fonte HTTPS. Não apresentar teorias, exemplos ou dados não verificados como conteúdo oficial.
