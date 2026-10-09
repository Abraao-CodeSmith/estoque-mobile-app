const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite (database.db)');
  }
});

db.serialize(() => {
  // Tabela de Usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Erro ao criar tabela usuarios:', err.message);
    else {
      console.log('✅ Tabela "usuarios" verificada/criada com sucesso.');
      // Adicionar colunas de IA caso ainda não existam no banco existente
      db.run(`ALTER TABLE usuarios ADD COLUMN ia_enabled INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE usuarios ADD COLUMN ia_provider TEXT DEFAULT 'gemini'`, () => {});
      db.run(`ALTER TABLE usuarios ADD COLUMN ia_api_key TEXT DEFAULT ''`, () => {});
      db.run(`ALTER TABLE usuarios ADD COLUMN ia_model TEXT DEFAULT 'gemini-flash-latest'`, () => {});
    }
  });

  // Tabela de Estoque com usuario_id para isolamento multi-tenant
  db.run(`
    CREATE TABLE IF NOT EXISTS estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      codigo TEXT DEFAULT '',
      produto TEXT NOT NULL,
      quantidade INTEGER DEFAULT 1,
      cor TEXT DEFAULT '',
      imagem TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Erro ao criar tabela estoque:', err.message);
    else console.log('✅ Tabela "estoque" verificada/criada com sucesso.');
  });
});

module.exports = db;
