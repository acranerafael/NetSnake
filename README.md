# NetSnake Challenge

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-ISC-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0-brightgreen)
![Bootstrap](https://img.shields.io/badge/bootstrap-5-blue)

Aplicação web interativa em estilo arcade/cobrinha que mede e demonstra latência, jitter e perda de pacotes entre cliente e servidor. A jogabilidade é impactada pela latência real coletada a cada comando.

---

## 1. Título do Projeto

- Nome: NetSnake Challenge
- Badges de status: build, versão, licença, Node.js e Bootstrap (acima)

---

## 2. Descrição

- Objetivo principal:
  - Sensibilizar sobre o impacto da rede em aplicações online, tornando latência, jitter e perda de pacotes perceptíveis através da jogabilidade.
- Funcionalidades principais:
  - Movimento automático contínuo com resposta aos comandos do usuário (teclado, botões de direção, clique no canvas).
  - Cada comando envia requisição ao servidor; o movimento só acontece após a resposta (medição de round-trip time – RTT).
  - Exibição de latência atual/média, jitter e perda de pacotes em tempo real.
  - Modos: Ping (estável), Jitter (instável), Solo (offline).
  - Efeitos visuais para jitter/perda (fantasmas, flash de latência).
  - Leaderboard local com métricas e pontuação.
  - Tutorial e relatório final com estatísticas.
- Tecnologias utilizadas:
  - Front-end: HTML5 + Bootstrap 5 (CDN) + JavaScript puro (DOM/Canvas).
  - Back-end: Node.js + Express (simulação de latência/jitter/perda).

---

## 3. Pré-requisitos de Instalação

- Versões específicas necessárias:
  - Node.js >= 18.x
  - npm >= 8.x (incluído no Node 18)
- Dependências de sistema:
  - Porta disponível (padrão `3000`) ou proxy reverso (Nginx/IIS) configurado.
  - Permissão para executar processos Node.
- Configurações ambientais obrigatórias (opcionais, mas recomendadas):
  - `PORT`: porta HTTP (ex.: `3000`).
  - `BASE_LATENCY_MS`: latência base da simulação no servidor (ex.: `60`).
  - `NODE_ENV`: `development` ou `production`.

Exemplos de configuração de ambiente:

- Windows PowerShell:
```
$env:PORT=3000
$env:BASE_LATENCY_MS=60
$env:NODE_ENV='production'
```
- Linux/macOS (bash/zsh):
```
export PORT=3000
export BASE_LATENCY_MS=60
export NODE_ENV=production
```

---

## 4. Instalação Passo a Passo

1) Clone do repositório:
```
git clone https://github.com/acranerafael/NetSnake.git
cd NetSnake
```
> Ajuste o URL se seu repositório for diferente (privado/empresa).

2) Instalação de dependências:
```
npm install
```

3) Configuração de variáveis de ambiente (opcional):
```
# PowerShell
$env:PORT=3000; $env:BASE_LATENCY_MS=60

# bash/zsh
export PORT=3000; export BASE_LATENCY_MS=60
```

4) Inicialização do projeto:
```
npm start
# ou
node server.js
```

5) Acesso:
```
http://localhost:3000/
```

Opcional (produção): PM2 e Docker

- PM2:
```
npm install -g pm2
pm2 start server.js --name netsnake
pm2 save
```
- Docker:
```
docker build -t netsnake .
docker run -d -p 3000:3000 --name netsnake netsnake
```

---

## 5. Uso Básico

- Comandos principais:
  - `npm start`: inicia o servidor Express e serve a UI.
  - `node server.js`: inicia diretamente sem scripts.
- Gameplay:
  - Clique em “Iniciar Partida”, use setas, D-pad ou clique no canvas.
  - A latência do último comando aparece próxima à cabeça da cobrinha e nos cards.
- Modos:
  - Ping: jitter baixo, perda baixa.
  - Jitter: jitter alto, perda maior.
  - Solo: offline, sem dependência de rede (para comparação).
- Endpoints úteis (exemplos):
```
# Healthcheck
curl http://localhost:3000/api/health

# Movimento (POST JSON)
curl -X POST http://localhost:3000/api/move \
  -H "Content-Type: application/json" \
  -d '{"direction":"right","mode":"ping","seq":1}'
```
- Screenshots: (substitua pelos seus)
  - docs/screenshot-home.png
  - docs/screenshot-gameplay.png

---

## 6. Configuração

- Arquivo principal do servidor: `server.js`
  - `PORT` via variável ambiente.
  - `BASE_LATENCY_MS` define latência base da simulação.
  - Função `simulateNetwork(mode)` controla jitter e perda por modo.
- Front-end: `public/`
  - `index.html`: layout Bootstrap, cards, modais.
  - `styles.css`: tema, animações e responsividade.
  - `app.js`: lógica do jogo, loop automático, fetch por movimento, métricas e leaderboard.
- Opções personalizáveis:
  - Intervalo do passo automático (`STEP_MS` em `app.js`).
  - Limiar de cores da barra de latência.
  - Intensidade dos efeitos de jitter/perda (fantasmas, flash).

---

## 7. Testes

- Como executar:
  - Atualmente `npm test` retorna um placeholder.
```
npm test
```
- Sugestão de suíte:
  - Unit tests (front-end lógicas puras, ex.: funções de estatística).
  - API tests (latência/jitter/perda simulada no `server.js`).
- Exemplo de setup com Jest (opcional):
```
npm install --save-dev jest
```
Adicionar no `package.json`:
```
"scripts": {
  "test": "jest"
}
```

---

## 8. Contribuição

- Diretrizes:
  - Abra issues claras com contexto e exemplos.
  - Siga padrões de estilo existentes no código.
- Padrão de commits (sugestão: Conventional Commits):
  - `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- Processo de pull request:
  - Fork → branch temática → PR com descrição, testes (se aplicável) e screenshots.

---

## 9. Licença

- Licença: ISC (veja `package.json`).
- Você pode usar, modificar e distribuir este software conforme os termos da licença ISC.

---

### Notas Adicionais

- Integração com servidor real: é possível adaptar o `server.js` para medir RTT de um endpoint externo específico, em vez de simular.
- Proxy reverso (Nginx/IIS) recomendado para HTTPS, compressão e roteamento.

