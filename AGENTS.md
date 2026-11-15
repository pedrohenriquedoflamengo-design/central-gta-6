# Regras do projeto

- O proprietário trabalha exclusivamente pelo iPhone. Nenhuma etapa dele pode exigir computador, terminal ou plugin exclusivo de desktop.
- Custo máximo autorizado: R$ 0. Não habilitar planos pagos, faturamento, recarga automática, cartão, SMS ou trials temporários. Respeitar cotas e documentar limitações reais; nunca prometer um ano de disponibilidade ininterrupta.
- Hospedagem atual: Cloudflare Pages em https://centralgta6.pages.dev, sincronizada com main. Netlify antiga continua existente.
- Backend escolhido: Pages Functions e D1 Free, binding DB. Login com Google Identity Services; não depender de Firebase ou Supabase.
- Trabalhar em branch de revisão. Não integrar à main sem aprovação explícita do proprietário. Atualizações de uma branch podem gerar prévias, mas não devem alterar a audiência ou a produção.
- Preservar identidade visual e conteúdo. Não inventar missões, datas ou notícias. Missões publicadas exigem fonte HTTPS; os dados de teste ficam exclusivamente em tests/.
- Nunca armazenar senhas Google, credenciais de serviço ou tokens em arquivos versionados. Somente um cliente OAuth web público é necessário; A administração deve ser configurada no Cloudflare: ADMIN_GOOGLE_SUB pode ser um segredo; ADMIN_GOOGLE_SUB_SHA256 é uma referência derivada que pode ficar no arquivo de configuração. Não versionar o ID Google original do proprietário.
- Para alteração no backend: npm test e npm run build. Confirmar autorização no servidor, isolamento de dados pessoais, CSRF e renderização de conteúdo como texto.
- O artefato de publicação é dist/, produzido por npm run build. Não publicar a raiz com dependências, testes ou arquivos de desenvolvimento.
