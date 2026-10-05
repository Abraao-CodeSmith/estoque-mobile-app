const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'estoque_app_secret_key_2024';

/**
 * Middleware que valida o token JWT no cabeçalho Authorization.
 * Se válido, injeta req.user = { id, nome, email }.
 * Se inválido ou ausente, retorna 401.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Faça login para continuar.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, nome, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
}

module.exports = authMiddleware;
