const AIService = require('../services/aiService');
const db = require('../config/database');

class AIController {
  /**
   * Processa a transcrição do áudio e extrai dados formatados em JSON para o formulário.
   */
  static async parseAudioTranscript(req, res) {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Nenhum texto de transcrição fornecido.' });
      }

      const userId = req.user.id;
      db.get(
        'SELECT ia_enabled, ia_provider, ia_api_key, ia_model FROM usuarios WHERE id = ?',
        [userId],
        async (err, userConfig) => {
          if (err) {
            console.error('Erro ao consultar configuração de IA do usuário:', err);
          }

          const extractedData = await AIService.extractProductData(text, userConfig);
          res.json({
            success: true,
            data: extractedData
          });
        }
      );
    } catch (err) {
      console.error('Erro no AIController:', err);
      res.status(500).json({
        error: 'Erro ao processar áudio com IA.',
        details: err.message
      });
    }
  }
}

module.exports = AIController;
