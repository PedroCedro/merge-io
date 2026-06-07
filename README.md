# Merge.IO

Merge.IO e um jogo .io inspirado em mecanicas de Slither.io, escrito em TypeScript, com servidor autoritativo via WebSocket, mapa preto limpo, skins, ranking em tempo real e colisao melhorada por distancia ponto-segmento.

## Como Rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

Para build de producao:

```bash
npm run build
npm start
```

O servidor de producao sobe em `http://localhost:8080` e serve os arquivos gerados em `dist/`.

## Controles

- Mouse ou toque: direcao da cobra
- Espaco: boost, consumindo comprimento
- Comida: aumenta score e tamanho
- Colisao com parede, corpo de outra cobra ou proprio corpo: morte

## Arquitetura

```text
src/
  shared/
    types.ts          Tipos de mensagens, snapshots e skins
  server/
    server.ts         HTTP + WebSocket
    world.ts          Tick autoritativo, comida, ranking e colisao
    entities.ts       SnakeEntity e Food
    math.ts           Vetores, angulos e ponto-segmento
    config.ts         Tuning do jogo
  client/
    main.ts           Bootstrap da UI e loop
    network.ts        Cliente WebSocket
    input.ts          Mouse, toque e boost
    renderer.ts       Canvas 2D, camera, skins e arena
    styles.css        UI minimalista
```

## Analise dos Repos de Referencia

1. `mathe00/slither-clone-sio`
   Melhor base de produto. Traz multiplayer, WebGL, ranking, skins, admin, AoI, minimapa, modo offline e colisao com workers. Aproveitavel: arquitetura modular, leaderboard, sistema de skins, food attraction, AoI e colisao precisa. Risco: muito grande, arquivado, cheio de features fora do escopo inicial.

2. `karankashyap04/slither-plus`
   Melhor referencia academica para lobbies e multiplayer com WebSockets. Aproveitavel: separacao cliente/servidor, game state sincronizado, ranking e salas privadas. Risco: backend Java e React CRA antigo, mais pesado para evoluir aqui.

3. `knagaitsev/slither.io-clone`
   Melhor referencia pedagogica e visual. Aproveitavel: movimento, crescimento, sombras, olhos, comida ao morrer e simplicidade de game loop. Risco: sem multiplayer e com Phaser antigo/local.

4. `iiegor/slither`
   Melhor referencia de protocolo, mas a menos reaproveitavel diretamente. Aproveitavel: ideia de mensagens pequenas e servidor Node WebSocket. Risco: CoffeeScript, `ws` muito antigo, incompleto.

## Decisoes do Merge.IO

- TypeScript end-to-end, com tipos compartilhados entre servidor e cliente.
- WebSocket puro (`ws`) em vez de Socket.IO, para manter protocolo pequeno e explicito.
- Servidor autoritativo: o cliente envia apenas alvo e boost; o servidor calcula movimento, comida, morte e ranking.
- Movimento inspirado no `headPath` do `knagaitsev/slither.io-clone`: a cabeca grava uma trilha e o corpo e reamostrado com espacamento fixo para evitar movimento comprimido ou nervoso.
- Colisao melhorada: cabeca contra segmentos usando distancia ponto-segmento, mais precisa que colisao apenas por pontos.
- Area of Interest: cada cliente recebe cobras e comidas proximas, reduzindo payload.
- Mapa preto limpo com borda discreta e pontos suaves, sem fundo poluido.
- Skins declarativas em `src/shared/types.ts`, compartilhadas por menu, render e ranking.

## Scripts

- `npm run dev`: Vite + servidor WebSocket em modo watch
- `npm run dev:client`: apenas cliente em `5173`
- `npm run dev:server`: apenas servidor em `8080`
- `npm run check`: typecheck
- `npm run build`: typecheck + build Vite
- `npm start`: servidor em `8080`, servindo `dist/` quando existir

## Proximos Passos

- Adicionar bots para preencher a arena em desenvolvimento solo.
- Criar salas privadas com codigo, baseado na melhor ideia do Slither+.
- Adicionar minimapa e interpolacao de snapshots para movimento ainda mais suave.
- Persistir estatisticas e nomes reservados.
- Criar assets proprios para comidas, boosts e cosméticos.
