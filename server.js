require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do Frontend e Uploads
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API Backend
app.use('/api', apiRoutes);

// Fallback para rota principal
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicialização do Servidor Express
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor de Estoque Mobile rodando em: http://localhost:${PORT}`);
  console.log(`📱 Acesse no seu navegador ou smartphone via rede local.`);
  console.log(`🤖 Provedor de IA configurado: ${process.env.IA_PROVIDER || 'gemini'}\n`);
});
