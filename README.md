# 📱 Estoque Mobile — Gestão Inteligente com IA & Voz

Sistema de Gestão de Estoque **Mobile-First**, modular e responsivo, desenvolvido em **Node.js, SQLite3 e Vanilla JavaScript**. Permite o cadastro e controle de produtos por **foto**, **reconhecimento de voz** e **processamento inteligente (IA ou Parser Heurístico local)**, com suporte a **múltiplos usuários isolados**, exportação e compartilhamento de dados em múltiplos formatos.

---

## 🌟 Funcionalidades Principais

- **🔐 Autenticação Multi-Usuário**:
  - Tela de **Login e Cadastro** integrada ao design Dark Theme, com abas para alternar entre os modos.
  - Senhas criptografadas com **bcryptjs** (hash seguro, nunca armazenadas em texto).
  - Sessão via **JWT** persistida no `localStorage` (válida por 7 dias).
  - Botão de **Logout** no cabeçalho.
  - **Isolamento Completo de Dados**: cada usuário visualiza, cadastra e exporta exclusivamente o seu próprio estoque. É impossível acessar os dados de outros usuários.

- **📸 Captura & Otimização de Fotos**:
  - Integração direta com a câmera do celular (`input capture="environment"`) ou escolha a partir da galeria.
  - **Compressão Automática com Sharp**: fotos pesadas de 5MB–12MB da câmera são redimensionadas (máx. 800px) e convertidas para **WebP** (~50KB), reduzindo o peso em mais de 98% sem perda visual perceptível.

- **🎤 Cadastro Rápido por Voz**:
  - **FAB de Microfone Flutuante**: botão verde na tela principal para ditar e cadastrar um produto em segundos.
  - **Reconhecimento de Voz Nativo**: utiliza a `Web Speech API` do navegador para transcrever o áudio localmente.
  - **Regras de Interpretação**:
    - Verbos de comando são ignorados: *"Adicionar"*, *"Cadastrar"*, *"Criar"*.
    - O **primeiro número** antes do produto = **quantidade**.
    - O **número após o produto** = **código**.
    - Se nenhuma cor for dita = **"Única"** (padrão).

- **🤖 Processamento Inteligente (IA & Parser Local)**:
  - Extrai automaticamente `quantidade`, `produto`, `código` e `cor` de frases naturais (ex: *"Adicionar 300 canetas 3011 preta"*).
  - **Parser Heurístico Local** (`IA_ENABLED=false`): funciona 100% offline, sem custo de API, resultado em milissegundos.
  - **Integração com Google Gemini SDK**: suporte ao SDK oficial `@google/genai` e provedores alternativos OpenAI e Groq.

- **📦 CRUD Completo de Produtos**:
  - Busca em tempo real por nome ou código.
  - **Edição de Produtos**: modal pré-preenchido com botão de lápis em cada card.
  - **Exclusão**: remove o produto e apaga a imagem do disco automaticamente.

- **📊 Exportação Multi-Formato & Compartilhamento Nativo**:
  - **Planilha Excel (.xlsx)**: estilizada com cabeçalhos coloridos via `exceljs`.
  - **Arquivo CSV (.csv)**: codificado em UTF-8, separado por ponto-e-vírgula (compatível com Excel).
  - **Banco SQLite (.db)**: backup direto do arquivo de dados.
  - **Web Share API**: no celular, permite enviar os arquivos diretamente pelo **WhatsApp, E-mail ou Google Drive**, com fallback para download no desktop.

---

## 🛠️ Tecnologias Utilizadas

### **Backend**
| Pacote | Uso |
|---|---|
| **Node.js** | Plataforma de execução |
| **Express.js** | Framework web REST |
| **SQLite3** | Banco de dados local (arquivo único) |
| **bcryptjs** | Criptografia segura de senhas |
| **jsonwebtoken** | Geração e validação de tokens JWT |
| **Multer** | Upload de imagens via `multipart/form-data` |
| **Sharp** | Compressão e conversão de imagens para WebP |
| **@google/genai** | SDK oficial do Google Gemini |
| **ExcelJS** | Geração de planilhas `.xlsx` |
| **JSON2CSV** | Conversão de dados para `.csv` |
| **Dotenv** | Gerenciamento de variáveis de ambiente |

### **Frontend**
| Tecnologia | Uso |
|---|---|
| **HTML5** | Estrutura semântica |
| **CSS3 Puro** | Dark Mode, Glassmorphism, variáveis, animações |
| **Vanilla JavaScript (ES6+)** | Lógica do cliente sem frameworks pesados |
| **Web Speech API** | Reconhecimento de voz nativo do navegador |
| **Web Share API** | Compartilhamento nativo de arquivos no celular |
| **FontAwesome & Plus Jakarta Sans** | Ícones e tipografia moderna |

---

## 🏗️ Arquitetura do Projeto

O projeto adota o padrão **MVC (Model-View-Controller)** com camada de **Services**, promovendo separação clara de responsabilidades.

```text
d:\clientes\estoque\
├── .env                        # Variáveis de ambiente (não versionar!)
├── .env.example                # Modelo de configuração do .env
├── server.js                   # Ponto de entrada do servidor Express
├── database.db                 # Banco SQLite (gerado automaticamente)
│
├── src/
│   ├── config/
│   │   └── database.js         # Conexão e criação automática das tabelas
│   │
│   ├── middleware/
│   │   └── authMiddleware.js   # Valida token JWT e injeta req.user
│   │
│   ├── controllers/
│   │   ├── authController.js   # Cadastro, Login e verificação de sessão
│   │   ├── productController.js# CRUD de produtos (filtrado por usuario_id)
│   │   ├── exportController.js # Exportação de dados (filtrada por usuario_id)
│   │   └── aiController.js     # Parsing de transcrição via IA ou regex
│   │
│   ├── services/
│   │   ├── aiService.js        # SDK Gemini / OpenAI / Groq + Parser Heurístico
│   │   └── exportService.js    # Geração de buffers Excel e CSV por usuário
│   │
│   └── routes/
│       └── api.js              # Mapeamento de rotas + middlewares de auth e Sharp
│
└── public/                     # Frontend SPA (Single Page Application)
    ├── index.html              # Estrutura + modais + tela de autenticação
    ├── css/
    │   └── style.css           # Design system, variáveis, animações
    ├── js/
    │   └── app.js              # Engine: auth, fetch com JWT, voz, wizard
    └── uploads/                # Imagens .webp comprimidas pelo Sharp
```

---

## 🎯 Racional Técnico

1. **Por que Vanilla JS e CSS Puro no Frontend?**
   - Evita o overhead de frameworks (React/Vue) e ferramentas de build. A página carrega instantaneamente mesmo em redes móveis instáveis.

2. **Por que SQLite3?**
   - Zero configuração de servidor externo. O estoque inteiro reside em `database.db` — migrar ou fazer backup é copiar um arquivo.

3. **Por que JWT no `localStorage`?**
   - Solução simples e eficaz para aplicações mobile-first sem backend de sessão. O token é reenviado a cada requisição pelo `authFetch()`. Tokens expirados redirecionam automaticamente para o login.

4. **Por que bcryptjs e não `crypto` nativo?**
   - `bcryptjs` é amplamente auditado, implementa o algoritmo bcrypt com fator de custo configurável, sendo a escolha padrão da indústria para hash de senhas.

5. **Por que Sharp para compressão de imagens?**
   - A biblioteca mais rápida do ecossistema Node.js para processamento de imagens. Fotos de câmeras modernas (5–12MB) são reduzidas para ~50KB sem perda visual, economizando ~98% de espaço em disco.

6. **Por que Parser Heurístico Local e não sempre IA?**
   - APIs de IA exigem faturamento ativo e dependem de internet. O parser local com `IA_ENABLED=false` garante funcionamento **100% offline**, instantâneo e sem custo.

7. **Por que Web Share API?**
   - Permite enviar relatórios Excel diretamente para o WhatsApp de dentro do sistema, sem baixar o arquivo para o gerenciador de arquivos do celular.

---

## ⚙️ Configuração e Execução

### 1. Pré-requisitos
- **Node.js** v18 ou superior.

### 2. Instalação
```bash
npm install
```

### 3. Configurar o `.env`
Copie o arquivo de exemplo e edite com seus valores:
```bash
# Windows
copy .env.example .env

# Linux / Mac
cp .env.example .env
```

Conteúdo do `.env`:
```env
PORT=3001

# Chave secreta JWT — use uma string longa e aleatória em produção!
JWT_SECRET=troque_por_uma_chave_secreta_longa

# IA desativada por padrão (parser local inteligente)
IA_ENABLED=false
IA_PROVIDER=gemini
IA_API_KEY=sua_chave_api_aqui
IA_MODEL=gemini-flash-latest
```

> **Dica para gerar um JWT_SECRET seguro:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4. Executar
```bash
# Produção
npm start

# Desenvolvimento (com reload automático via nodemon)
npm run dev
```

O servidor iniciará em `http://localhost:3001`.

---

## 📱 Testando no Celular

### Via Rede Local Wi-Fi:
1. Verifique seu IP com `ipconfig` (Windows) ou `ifconfig` (Linux/Mac).
2. No celular (mesma rede), acesse: `http://SEU_IP:3001` (ex: `http://192.168.0.10:3001`).

### Via HTTPS (necessário para microfone no navegador móvel):
```bash
npx cloudflared tunnel --url http://localhost:3001
```
Copie o link `https://...trycloudflare.com` gerado e abra no celular.

---

## 🔐 Variáveis de Ambiente — Referência Completa

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta do servidor |
| `JWT_SECRET` | *(obrigatório)* | Chave secreta para assinar tokens JWT |
| `IA_ENABLED` | `false` | `true` para usar API de IA externa |
| `IA_PROVIDER` | `gemini` | Provedor: `gemini`, `openai` ou `groq` |
| `IA_API_KEY` | — | Chave da API do provedor escolhido |
| `IA_MODEL` | `gemini-flash-latest` | Modelo a ser utilizado pela IA |

---

## 📄 Licença
Software modular de gestão de estoque Mobile-First. Livre para uso comercial ou interno.
