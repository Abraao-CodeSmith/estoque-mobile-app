const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'estoque_app_secret_key_2024';
const JWT_EXPIRES = '7d'; // Token válido por 7 dias

class AuthController {
  /**
   * POST /api/auth/register
   * Cadastra um novo usuário e retorna o token JWT.
   */
  static async register(req, res) {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    try {
      // Verificar se o e-mail já está em uso
      db.get('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()], async (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao verificar e-mail.' });
        }
        if (existing) {
          return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
        }

        // Criptografar senha
        const hash = await bcrypt.hash(senha, 12);

        db.run(
          'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
          [nome.trim(), email.toLowerCase().trim(), hash],
          function (insertErr) {
            if (insertErr) {
              console.error('Erro ao cadastrar usuário:', insertErr.message);
              return res.status(500).json({ error: 'Erro ao criar conta. Tente novamente.' });
            }

            const userId = this.lastID;
            const token = jwt.sign(
              { id: userId, nome: nome.trim(), email: email.toLowerCase().trim() },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES }
            );

            console.log(`✅ Novo usuário cadastrado: ${nome} (${email})`);
            res.status(201).json({
              success: true,
              token,
              user: { id: userId, nome: nome.trim(), email: email.toLowerCase().trim() }
            });
          }
        );
      });
    } catch (err) {
      console.error('Erro no cadastro:', err.message);
      res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }
  }

  /**
   * POST /api/auth/login
   * Autentica o usuário e retorna o token JWT.
   */
  static async login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    db.get(
      'SELECT * FROM usuarios WHERE email = ?',
      [email.toLowerCase().trim()],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar usuário.' });
        }
        if (!user) {
          return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }

        try {
          const senhaValida = await bcrypt.compare(senha, user.senha);
          if (!senhaValida) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
          }

          const token = jwt.sign(
            { id: user.id, nome: user.nome, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
          );

          console.log(`🔑 Login realizado: ${user.nome} (${user.email})`);
          res.json({
            success: true,
            token,
            user: { id: user.id, nome: user.nome, email: user.email }
          });
        } catch (bcryptErr) {
          res.status(500).json({ error: 'Erro ao verificar senha.' });
        }
      }
    );
  }

  /**
   * GET /api/auth/me
   * Retorna os dados do usuário logado através do token.
   */
  static me(req, res) {
    res.json({ success: true, user: req.user });
  }
}

module.exports = AuthController;
