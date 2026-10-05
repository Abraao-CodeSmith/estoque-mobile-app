const AIService = require('../services/aiService');

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

      const extractedData = await AIService.extractProductData(text);
      res.json({
        success: true,
        data: extractedData
      });
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
