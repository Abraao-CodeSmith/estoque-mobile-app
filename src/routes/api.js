const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ProductController = require('../controllers/productController');
const ExportController = require('../controllers/exportController');
const AIController = require('../controllers/aiController');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Garantir que a pasta public/uploads existe
const uploadsDir = path.resolve(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer usa memória temporária (Sharp processa antes de salvar no disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

/**
 * Middleware de compressão de imagens com Sharp.
 * Redimensiona para máx 800px e converte para WebP (80% qualidade).
 */
const compressImage = async (req, res, next) => {
  if (!req.file || !req.file.buffer) return next();

  try {
    const filename = `prod-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const outputPath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    req.file.filename = filename;
    req.file.path = outputPath;
    next();
  } catch (err) {
    console.error('⚠️ Erro ao comprimir imagem:', err.message);
    next();
  }
};

// ==================== ROTAS PÚBLICAS (Sem autenticação) ====================
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// ==================== ROTAS PROTEGIDAS (Exigem JWT válido) ====================
router.get('/auth/me', authMiddleware, AuthController.me);
router.get('/user/settings', authMiddleware, AuthController.getSettings);
router.put('/user/settings', authMiddleware, AuthController.updateSettings);

// Produtos (CRUD - isolado por usuário)
router.get('/produtos', authMiddleware, ProductController.getAll);
router.post('/produtos', authMiddleware, upload.single('imagemFile'), compressImage, ProductController.create);
router.put('/produtos/:id', authMiddleware, upload.single('imagemFile'), compressImage, ProductController.update);
router.delete('/produtos/:id', authMiddleware, ProductController.delete);

// Exportação (isolada por usuário)
router.get('/export/db', authMiddleware, ExportController.exportDatabase);
router.get('/export/excel', authMiddleware, ExportController.exportExcel);
router.get('/export/csv', authMiddleware, ExportController.exportCSV);

// IA (Parse de transcrição)
router.post('/ai/parse', authMiddleware, AIController.parseAudioTranscript);

module.exports = router;
