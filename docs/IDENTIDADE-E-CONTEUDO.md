# Identidade e conteúdo

A marca da Central combina um emblema original de horizonte, via e palmeira com tipografia condensada e a paleta rosa, pêssego, violeta, verde e fundo escuro já presente no projeto. Não reproduz o logotipo de GTA VI nem se apresenta como marca oficial.

- Emblema e favicon: `assets/brand/emblem.svg` e `assets/favicon.svg`.
- Assinatura horizontal: `assets/brand/wordmark.svg`.
- Imagem para compartilhamento: `assets/social-card.png`, 1200 × 630.
- Frase principal: **Leonida começa aqui.**
- Frase de comunidade: **O neon acende. A Central te conecta.**
- Estilos adicionais: `assets/identity.css`, preservando os estilos e fluxos existentes.

## Conteúdo editorial

A página inicial reúne sinopse, dois protagonistas, seis perfis complementares (Real Dimez é um duo), seis regiões, três links para notícias oficiais e trailers. `guia.html` acrescenta ficha do jogo, história, destinos, fontes, biblioteca de mídia e doze perguntas frequentes. Nenhuma missão fictícia é cadastrada.

Fontes consultadas em 14/11/2026:

- https://www.rockstargames.com/VI — lançamento anunciado em 19/11/2026 e plataformas PlayStation 5 / Xbox Series X|S.
- https://www.rockstargames.com/VI/only-in-leonida — personagens.
- https://www.rockstargames.com/VI/media/screenshots — imagens e nomes de cenários.
- https://www.rockstargames.com/VI/media/videos — biblioteca de vídeos oficiais.
- https://www.rockstargames.com/newswire — anúncios com links individuais na página inicial.

Textos originais resumem fatos; rumores, requisitos de PC, tamanho do mapa, localizações exatas, missões e datas não divulgadas não são completados com suposições. Atualizações são editoriais, não um feed automático.

## Contagem regressiva

`assets/explore.js` lê a referência explícita `2026-11-19T00:00:00-03:00` em `index.html`. Essa é a chegada da **data anunciada**, à meia-noite em Brasília, não um horário oficial de desbloqueio. A tela explica a referência e aponta para a fonte. Atualiza pelo relógio do aparelho, pausa em segundo plano e recalcula ao voltar. Ao zerar, substitui o contador por um aviso para consultar a disponibilidade, sem afirmar que o jogo já foi liberado. Sem JavaScript, a data continua legível. Se houver adiamento, atualizar a referência e os textos editoriais.

## Mapa interativo

`mapa.html` tem busca, filtros, seleção por marcador ou lista, fotos, link para o guia, zoom de 100% a 200%, arraste após zoom, setas do teclado e restauração. A URL preserva a região selecionada (`mapa.html#keys`, por exemplo). Busca e filtros operam localmente, sem API paga ou consulta ao banco. Todos os destinos também ficam acessíveis sem JavaScript.

O desenho é uma **composição ilustrativa** criada para explorar as regiões. Não é um mapa oficial: posições, formato, dimensões, distâncias e linhas decorativas não indicam coordenadas ou rotas do jogo. A interface explica essa limitação junto ao título e às fontes. Não há dados de missões ou colecionáveis inventados.

## Créditos de imagens

As capturas em `assets/world/` pertencem à Rockstar Games e foram obtidas no CDN oficial, em dimensões adequadas ao portal. Os oito arquivos somam aproximadamente 867 KB. As imagens de regiões carregam sob demanda; a capa tem prioridade. Os créditos são visíveis nas páginas.

Base das URLs: `https://www.rockstargames.com/VI/_next/static/media/`. Foram solicitadas variantes do CDN com `?akim=1&imdensity=1&imwidth=960` (1600 na capa).

| Arquivo local | Arquivo de origem |
| --- | --- |
| vice-city.jpg | Vice_City_01.135x56yoeu.6t.jpg |
| keys.jpg | Leonida_Keys_01.0zgz7tveur6y8.jpg |
| port-gellhorn.jpg | Port_Gellhorn_01.0fmisvza-5-cq.jpg |
| grassrivers.jpg | Grassrivers_01.1096rw4lbjur_.jpg |
| ambrosia.jpg | Ambrosia_01.0rqphs0gazkm..jpg |
| kalaga.jpg | Mount_Kalaga_National_Park_01.0v5fl0f83hjv_.jpg |
| hero.jpg | Jason_and_Lucia_14.10e7v.06pcm_t.jpg |
| vice-night.jpg | Vice_City_27.0d2e~w_r93hmh.jpg |

A hospedagem permanece no plano gratuito. Não há novos serviços, cartões, assinaturas ou períodos de teste.

Miniaturas locais dos trailers (`assets/trailers/`), também da galeria oficial de vídeos: `GTAVI_Trailer2_poster.0cosv-uzbpt91.jpg` e `GTAVI_Trailer1_poster.12x2gvspcm_3m.jpg`, na mesma base do CDN com largura 960. Os links continuam abrindo os trailers oficiais no YouTube.
