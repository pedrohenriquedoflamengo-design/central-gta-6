# Comunidade: configuração gratuita pelo iPhone

O código está na branch de revisão. Não integrar à main sem a aprovação do proprietário.

## O que já está preparado

- Login Google em modo redirecionamento, inclusive para Safari/iOS.
- Sessão em cookie HttpOnly/Secure com expiração de sete dias. A expiração é da sessão do jogador, não do plano gratuito nem do site.
- Apelidos, tópicos, respostas, spoilers, denúncias, moderação e progresso por conta.
- Cadastro administrativo de missões em rascunho/publicadas com fonte.
- APIs restritas à mesma origem. Publicações em texto puro, consultas parametrizadas e limites de gravação por jogador.
- Nenhum dado fictício é inserido no banco real.

## Planos e custo

Use exclusivamente Cloudflare Free. Não habilite Workers Paid, faturamento de Google Cloud, SMS, R2 ou complementos pagos. Google Identity Services não exige Firebase. Não é necessário um segredo OAuth para este fluxo.

Os arquivos estáticos usam somente as rotas estáticas do Pages. `_routes.json` limita as Functions a `/api/*`. Fórum e catálogos usam páginas de 20 registros e não possuem polling contínuo. As cotas de API, linhas lidas/escritas e armazenamento continuam aplicáveis. Uma consulta pode ler mais linhas do que retorna; os índices e a paginação reduzem esse custo. Não há garantia de disponibilidade ininterrupta por um ano.

- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.google.com/identity/gsi/web/guides/overview

## 1. Configuração atual por arquivo

`wrangler.json` define explicitamente o cliente OAuth público e a associação DB para a prévia. O ID do banco foi fornecido pelo proprietário a partir do endereço do D1 no painel. Nenhuma senha ou segredo Google é versionado.

Para a validação inicial, a prévia usa o único banco que o proprietário criou, `central-gta6`, ainda sem dados no momento da configuração. O site estático atual da main não consulta esse banco. Não inserir exemplos fictícios nele: os testes automatizados usam apenas bancos locais. Antes de abrir a comunidade publicamente, separar o banco de teste e atualizar o database_id de env.preview. A configuração de nível superior preserva a associação prevista para produção, mas só será aplicada à produção após aprovação e implantação da main.

O painel usa este comando de build compatível com a main antiga e a branch nova:

```sh
if [ -f package.json ]; then npm run build; else mkdir -p dist && cp index.html dist/; fi
```

Diretório de saída: `dist`. As prévias estão habilitadas para branches que não sejam main. A URL estável confirmada da branch é:

https://fix-responsividade-acessibil.centralgta6.pages.dev

Não é necessário localizar um seletor de ambiente na interface móvel para alterar o cliente Google ou a associação DB: esses valores agora são definidos no arquivo e aplicados pela próxima implantação da branch.

## 2. Criar o cliente Google no navegador

Abra https://console.cloud.google.com/ no Safari. Crie ou selecione um projeto sem ativar faturamento e abra Google Auth Platform (ou APIs e serviços > Credenciais, conforme a interface).

Configure o nome Central GTA 6, contato do proprietário e público externo. Durante os testes, adicione somente as contas de teste autorizadas. Crie um cliente OAuth do tipo Aplicativo da Web.

Para produção, os endereços serão:

- Origem JavaScript: `https://centralgta6.pages.dev`
- Redirecionamento: `https://centralgta6.pages.dev/api/auth/google`

Adicione também a origem **exata** da prévia que será usada e o redirecionamento correspondente terminando em `/api/auth/google`. URLs de prévia mudam; prefira a URL estável da branch fornecida pelo Cloudflare e não use curingas. Não digite URLs não confirmadas pelo painel.

O aplicativo usa apenas identidade básica, não pede acesso a Gmail, Drive ou outros serviços. Antes de abrir o login para todos, conclua a configuração de público/branding e retire-o do modo de teste seguindo as exigências que o Google apresentar. Não contorne validações do Google.

O ID público do cliente fornecido pelo proprietário já está em `wrangler.json`. Registre também a origem estável da prévia no cliente Google: `https://fix-responsividade-acessibil.centralgta6.pages.dev`, e seu redirecionamento exato `https://fix-responsividade-acessibil.centralgta6.pages.dev/api/auth/google`. Não envie a senha Google ou um segredo OAuth ao repositório.

## 3. Primeiro acesso e administrador

A conta indicada pelo proprietário foi habilitada na prévia por `ADMIN_GOOGLE_SUB_SHA256`, uma referência SHA-256 do identificador verificado, com prefixo de domínio `central-gta6:admin:`. O ID Google original não foi gravado no repositório. Essa configuração é aplicada somente à prévia; não concede administração automaticamente em produção. A referência deve ser alterada apenas pelo proprietário do repositório.

Após o login Google válido, as tabelas são criadas automaticamente no D1 associado. A inicialização não apaga dados e não pode ser disparada por visitantes anônimos. O catálogo começa vazio, e o apelido inicial é gerado pelo portal para não expor automaticamente o nome pessoal do Google.

Abra Minha conta > Identificação da conta e copie o identificador da conta do proprietário. No Cloudflare, configure `ADMIN_GOOGLE_SUB` como uma variável do tipo **Segredo**, com esse identificador e repita a implantação. O próximo acesso exibirá o painel administrativo. Nenhum jogador ganha administração automaticamente por ser o primeiro a entrar.

O identificador não é uma senha, mas não é exibido no fórum. O banco armazena o identificador Google e o apelido; não armazena sua senha nem o ID token retornado pelo Google.

## 4. Revisar antes de integrar

Teste login e saída no Safari real, troca de apelido, tópicos, respostas, denúncias, moderação, rascunhos, publicação de uma missão real com fonte e progresso em duas contas. Use o banco de teste. Testes automatizados com contas fictícias não substituem a validação real da autorização Google.

Somente depois da aprovação do proprietário: integrar à main, aplicar `npm run build`/`dist` nas configurações de produção, conferir a associação `DB` de produção e configurar `GOOGLE_CLIENT_ID` e `ADMIN_GOOGLE_SUB`. A integração do GitHub continuará publicando as alterações aprovadas automaticamente. Não copie as publicações fictícias dos testes para a produção.

## Manutenção

A administração pode ocultar publicações, encerrar denúncias e suspender autores. Solicitações de exclusão de dados exigem ação do proprietário; a política do portal orienta contato sem publicar dados pessoais em issues abertas. Antes de abrir inscrições públicas, revise esse canal de atendimento.

O D1 oferece restauração dentro da janela gratuita do plano. Use o painel para acompanhar cotas e fazer exportações periódicas; não ative backup pago. Dados podem crescer ao longo do ano: monitore o armazenamento e nunca habilite um plano pago para continuar sem autorização.
