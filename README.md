# Merge.IO

Merge.IO é um jogo `.io` inspirado nas mecânicas de Slither.io. O projeto utiliza
TypeScript no cliente e no servidor, renderização em Canvas 2D e um servidor
autoritativo que sincroniza as partidas por WebSocket.

## Funcionalidades

- Movimento contínuo com corpo reamostrado em uma trilha de posições.
- Crescimento visual suave, sem aumentar o corpo inteiro no instante da coleta.
- Comidas comuns e massas de cobras derrotadas com valores diferentes.
- Bots em três níveis de habilidade para partidas individuais.
- Ranking e minimapa em tempo real.
- Colisão com paredes, corpo próprio e outras cobras.
- Boost normal e boost infinito para testes.
- Skins coloridas e skins inspiradas em países.
- Controles por mouse, teclado, toque ou joystick virtual.
- Interface adaptada para celulares em orientação horizontal.
- Modo PWA com manifesto, ícones e service worker.
- Ferramentas de desenvolvimento para pausa, invencibilidade, círculo automático
  e limpeza de massas.

## Tecnologias

- TypeScript
- Vite
- Canvas 2D
- Node.js
- Express
- WebSocket com `ws`

## Requisitos

- Node.js 20 ou superior
- npm

## Instalação

```bash
git clone https://github.com/PedroCedro/merge-io.git
cd merge-io
npm install
```

## Desenvolvimento

Inicie o cliente Vite e o servidor WebSocket:

```bash
npm run dev
```

Depois, abra:

```text
http://localhost:5173
```

Durante o desenvolvimento, o Vite encaminha as conexões de `/ws` para o
servidor local na porta `8080`.

Também é possível executar cada processo separadamente:

```bash
npm run dev:client
npm run dev:server
```

## Produção local

Gere os arquivos do cliente:

```bash
npm run build
```

Inicie o servidor:

```bash
npm start
```

Quando a pasta `dist` existe, o servidor Express entrega o frontend e atende o
WebSocket no mesmo endereço:

```text
http://localhost:8080
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia cliente e servidor em modo de desenvolvimento |
| `npm run dev:client` | Inicia apenas o Vite na porta `5173` |
| `npm run dev:server` | Inicia apenas o servidor na porta `8080` |
| `npm run check` | Executa a verificação de tipos |
| `npm run build` | Verifica os tipos e gera o frontend em `dist` |
| `npm start` | Inicia o servidor de produção |

## Controles

### Computador

- Mouse: direciona a cobra.
- Teclado: alternativa de direção ativada nas configurações.
- Espaço ou botão do mouse: ativa o boost.

### Celular

- Toque: direciona a cobra pela posição tocada.
- Joystick: controle virtual opcional.
- Botão `BOOST`: ativa a aceleração.
- Botão `Tela cheia`: solicita tela cheia e orientação horizontal quando o
  navegador permite.

## Arquitetura

```text
src/
├── client/
│   ├── main.ts                   Estado e fluxo principal do cliente
│   ├── ui.ts                     Referências obrigatórias da interface
│   ├── input.ts                  Mouse, teclado, toque e boost
│   ├── mobileControls.ts         Joystick e boost virtual
│   ├── network.ts                Cliente WebSocket
│   ├── renderer.ts               Renderização da arena em Canvas 2D
│   ├── minimap.ts                Renderização do minimapa
│   ├── snapshotInterpolation.ts  Suavização entre estados do servidor
│   ├── settings.ts               Preferências persistidas no navegador
│   ├── snakeSprites.ts           Elementos visuais da cobra
│   └── styles.css                Layout responsivo e estilos
├── server/
│   ├── server.ts                 Servidor HTTP e protocolo WebSocket
│   ├── world.ts                  Simulação, bots, colisões e snapshots
│   ├── entities.ts               Cobra, crescimento e criação de comidas
│   ├── math.ts                   Funções geométricas
│   └── config.ts                 Parâmetros de balanceamento
└── shared/
    └── types.ts                  Tipos, mensagens e catálogo de skins
```

## Fluxo da partida

1. O cliente abre uma conexão WebSocket.
2. Ao clicar em **Jogar**, envia nome, skin, modo e preferência do minimapa.
3. O servidor cria a cobra e retorna o primeiro snapshot.
4. O cliente envia apenas direção e estado do boost.
5. O servidor calcula movimento, crescimento, colisões, comidas e ranking.
6. Cada jogador recebe um recorte do mundo baseado na sua área de interesse.
7. O cliente interpola os snapshots para suavizar o movimento na tela.

## Configuração do WebSocket

O cliente procura o servidor nesta ordem:

1. Variável `VITE_WS_URL`.
2. Porta `8080` quando o Vite está em `5173`.
3. Caminho `/ws` no mesmo domínio do frontend.

Exemplo para usar um servidor externo:

```bash
VITE_WS_URL=wss://seu-servidor.example.com/ws npm run build
```

No PowerShell:

```powershell
$env:VITE_WS_URL = 'wss://seu-servidor.example.com/ws'
npm run build
```

## PWA e celular

O projeto contém:

- `public/manifest.webmanifest`
- `public/sw.js`
- ícones comuns e máscara para instalação
- preferência por orientação horizontal

Para instalar o PWA e usar recursos como service worker e tela cheia com maior
compatibilidade, abra o jogo por HTTPS.

Em dispositivos com tela de toque, um perfil de desempenho é ativado
automaticamente:

- renderização limitada a 30 FPS;
- resolução interna do canvas limitada a `1.25x`;
- corpo das cobras desenhado com menos operações;
- massas sem composição e brilho caros;
- minimapa em resolução reduzida;
- snapshots recebidos a 15 Hz;
- área de interesse e quantidade de comidas visíveis reduzidas.

A simulação do servidor continua em 30 ticks por segundo, portanto física,
colisões e crescimento não ficam mais lentos.

## Deploy

O arquivo `vercel.json` publica o frontend Vite na Vercel. Porém, o servidor do
jogo mantém conexões WebSocket persistentes e não pode ser substituído por uma
publicação somente estática.

Em produção, utilize uma destas opções:

- Hospede o servidor Node.js em uma plataforma compatível com WebSocket e defina
  `VITE_WS_URL` antes do build.
- Execute frontend e servidor juntos em um host Node.js.
- Durante testes, exponha o servidor local por um túnel HTTPS/WSS.

Sem um servidor WebSocket acessível, a interface permanece em
`Reconectando...` e o botão **Jogar** fica desabilitado.

## Parâmetros de balanceamento

Os principais valores ficam em `src/server/config.ts`:

- dimensões da área jogável;
- tamanho e quantidade de comidas;
- velocidade e aceleração;
- crescimento do raio e do corpo;
- custo do boost;
- quantidade de bots;
- área de interesse;
- limites de dados enviados a cada cliente.

Alterações nesse arquivo afetam diretamente desempenho e jogabilidade. Faça
ajustes pequenos e teste com cobras grandes antes de publicar.

### Níveis dos bots

O modo individual mantém doze bots com nomes e comportamentos fixos. Cada um dos
quatro quadrantes recebe um bot `dumb`, um `normal` e um `smart`:

| Nível | Bots | Comportamento |
| --- | --- | --- |
| `dumb` | `Dumb-Dot`, `Dumb-Zig`, `Dumb-Lost`, `Dumb-Drift` | Visão curta, decisões lentas e movimento mais aleatório |
| `normal` | `Normal-Byte`, `Normal-Nova`, `Normal-Dash`, `Normal-Echo` | Equilíbrio entre coleta, fuga e exploração |
| `smart` | `Smart-Apex`, `Smart-Orbit`, `Smart-Viper`, `Smart-Nexus` | Visão ampla, antecipação de perigo e prioridade para massas valiosas |

Os nomes são restaurados no respawn, portanto não surgem bots duplicados durante
a partida. Cada bot reaparece dentro do seu quadrante original e nasce com o
mesmo tamanho mínimo do jogador.

Ao iniciar ou reiniciar uma partida individual sem outro jogador humano ativo,
o servidor também recria comidas e bots. Assim, **Jogar novamente** começa uma
simulação nova em vez de reutilizar o estado da partida anterior.

## Estado do projeto

O projeto está em desenvolvimento ativo. As principais áreas ainda abertas são:

- hospedar o servidor WebSocket em produção;
- adicionar testes automatizados para física e protocolo;
- medir desempenho em celulares de entrada;
- revisar segurança e limites para partidas públicas;
- separar salas e partidas independentes.

## Licença

Este repositório ainda não possui uma licença definida. Até que uma licença seja
adicionada, o código permanece com todos os direitos reservados ao autor.
