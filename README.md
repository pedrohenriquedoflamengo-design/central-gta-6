# Central GTA 6

Portal independente de fãs de GTA VI em HTML, CSS e JavaScript, publicado pela Netlify a partir da branch `main`.

## Estrutura

- `index.html`: conteúdo, navegação e metadados.
- `assets/styles.css`: identidade visual original e ajustes responsivos.
- `assets/app.js`: menu acessível, animações progressivas e barra de rolagem.
- `assets/favicon.svg`: ícone do portal.
- `assets/social-card.png`: imagem de compartilhamento (1200 × 630).

Sem instalação de dependências ou compilação. Para testar localmente, execute `python3 -m http.server 4173` nesta pasta e abra `http://localhost:4173`.

## Revisão desta correção

- Ajustes para celulares, tablets, monitores e orientação paisagem.
- Menu compacto até 1000 px, fechamento por Escape, seleção, toque externo e saída do foco.
- Âncoras com espaço para o cabeçalho fixo e link para pular ao conteúdo.
- Conteúdo visível sem JavaScript ou IntersectionObserver; navegação disponível sem JavaScript.
- Animações decorativas pausadas fora de vista ou em aba oculta; movimento reduzido respeitado.
- Contagem regressiva sem data substituída por acesso às novidades oficiais; textos de demonstração removidos.
- Notícias continuam sendo uma seleção de fontes oficiais: não há CMS, notícias automáticas ou matérias próprias nesta etapa.
- Canonical e URLs de compartilhamento usam o domínio atual. Atualize-os se o domínio mudar.

Verificado no Chromium em 320×740, 390×844, 768×1024, 820×1180, 1024×768, 1440×900, 1920×1080 e 844×390: sem rolagem horizontal, sem corte do título ou sobreposição dos botões com o rodapé da capa. Menu, Escape e âncoras testados. Também foram verificados os modos sem JavaScript e sem IntersectionObserver, sem erros de JavaScript nos testes.

Safari/iOS e aparelhos físicos ainda precisam de validação. Não foram medidas notas Lighthouse.

A revisão deve ocorrer na branch `fix/responsividade-acessibilidade`, antes de integrar à `main`. Deploy Previews dependem da configuração da Netlify; não há mudança na hospedagem nesta correção.

## Perfis dos protagonistas

A seção de personagens apresenta Lucia Caminos e Jason Duval com imagens oficiais, resumo e biografia expansível. O controle usa `details`/`summary` nativos: funciona por toque, mouse e teclado, inclusive sem JavaScript. As duas biografias podem ficar abertas ao mesmo tempo.

Informações resumidas em português a partir da [apresentação oficial de pessoas e lugares da Rockstar Games](https://www.rockstargames.com/VI/only-in-leonida). Nenhum rumor ou detalhe de trama além da apresentação oficial foi acrescentado. Os arquivos de imagem foram preservados como publicados pela Rockstar, armazenados localmente, com carregamento tardio e dimensões reservadas. Direitos das imagens pertencem à Rockstar Games.

Fontes das imagens:

- Lucia: https://www.rockstargames.com/VI/_next/static/media/mobile.01e24lvhdu677.jpg
- Jason: https://www.rockstargames.com/VI/_next/static/media/mobile.0jzys13fkqnae.jpg

Os novos perfis foram verificados nas mesmas oito dimensões indicadas acima, incluindo abertura/fechamento por clique, Enter e Espaço, carregamento das imagens, ausência de rolagem horizontal e modos sem JavaScript/IntersectionObserver.
