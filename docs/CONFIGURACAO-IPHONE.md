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

## 1. Configurar a prévia no Cloudflare

O projeto `centralgta6` já existe. O banco criado pelo proprietário foi associado com nome de variável `DB`.

No painel do projeto, em Configurações > Builds e implantações, use as configurações do ambiente de **prévia**, mantendo produção inalterada enquanto main ainda contém a versão antiga:

- Branch de prévia: `fix/responsividade-acessibilidade`.
- Predefinição: Nenhum.
- Comando: `npm run build`.
- Diretório de saída: `dist`.
- Node.js: 22 ou superior.

Para isolamento de dados, crie um segundo D1 gratuito chamado `central-gta6-teste` e associe-o à variável `DB` no ambiente **prévia**. O banco `central-gta6` fica reservado para produção. Verifique se a prévia dessa branch está habilitada e repita a implantação após salvar as configurações.

## 2. Criar o cliente Google no navegador

Abra https://console.cloud.google.com/ no Safari. Crie ou selecione um projeto sem ativar faturamento e abra Google Auth Platform (ou APIs e serviços > Credenciais, conforme a interface).

Configure o nome Central GTA 6, contato do proprietário e público externo. Durante os testes, adicione somente as contas de teste autorizadas. Crie um cliente OAuth do tipo Aplicativo da Web.

Para produção, os endereços serão:

- Origem JavaScript: `https://centralgta6.pages.dev`
- Redirecionamento: `https://centralgta6.pages.dev/api/auth/google`

Adicione também a origem **exata** da prévia que será usada e o redirecionamento correspondente terminando em `/api/auth/google`. URLs de prévia mudam; prefira a URL estável da branch fornecida pelo Cloudflare e não use curingas. Não digite URLs não confirmadas pelo painel.

O aplicativo usa apenas identidade básica, não pede acesso a Gmail, Drive ou outros serviços. Antes de abrir o login para todos, conclua a configuração de público/branding e retire-o do modo de teste seguindo as exigências que o Google apresentar. Não contorne validações do Google.

Copie o ID público do cliente terminado em `.apps.googleusercontent.com`. No Cloudflare, Configurações > Variáveis e segredos, defina `GOOGLE_CLIENT_ID` no ambiente de prévia e repita a implantação. Não envie a senha Google ou um segredo OAuth ao repositório.

## 3. Primeiro acesso e administrador

Após o login Google válido, as tabelas são criadas automaticamente no D1 associado. A inicialização não apaga dados e não pode ser disparada por visitantes anônimos. O catálogo começa vazio, e o apelido inicial é gerado pelo portal para não expor automaticamente o nome pessoal do Google.

Abra Minha conta > Identificação da conta e copie o identificador da conta do proprietário. No Cloudflare, configure a variável `ADMIN_GOOGLE_SUB` com esse identificador e repita a implantação. O próximo acesso exibirá o painel administrativo. Nenhum jogador ganha administração automaticamente por ser o primeiro a entrar.

O identificador não é uma senha, mas não é exibido no fórum. O banco armazena o identificador Google e o apelido; não armazena sua senha nem o ID token retornado pelo Google.

## 4. Revisar antes de integrar

Teste login e saída no Safari real, troca de apelido, tópicos, respostas, denúncias, moderação, rascunhos, publicação de uma missão real com fonte e progresso em duas contas. Use o banco de teste. Testes automatizados com contas fictícias não substituem a validação real da autorização Google.

Somente depois da aprovação do proprietário: integrar à main, aplicar `npm run build`/`dist` nas configurações de produção, conferir a associação `DB` de produção e configurar `GOOGLE_CLIENT_ID` e `ADMIN_GOOGLE_SUB`. A integração do GitHub continuará publicando as alterações aprovadas automaticamente. Não copie as publicações fictícias dos testes para a produção.

## Manutenção

A administração pode ocultar publicações, encerrar denúncias e suspender autores. Solicitações de exclusão de dados exigem ação do proprietário; a política do portal orienta contato sem publicar dados pessoais em issues abertas. Antes de abrir inscrições públicas, revise esse canal de atendimento.

O D1 oferece restauração dentro da janela gratuita do plano. Use o painel para acompanhar cotas e fazer exportações periódicas; não ative backup pago. Dados podem crescer ao longo do ano: monitore o armazenamento e nunca habilite um plano pago para continuar sem autorização.
