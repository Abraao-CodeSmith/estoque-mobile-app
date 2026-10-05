const ExportService = require('../services/exportService');

class ExportController {
  /**
   * Baixa o banco de dados completo (.db).
   * Nota: o .db contém dados de todos os usuários, para uso administrativo.
   */
  static exportDatabase(req, res) {
    try {
      const dbPath = ExportService.getDBFilePath();
      res.download(dbPath, 'estoque_database.sqlite', (err) => {
        if (err && !res.headersSent) {
          console.error('Erro no download do banco:', err);
          res.status(500).json({ error: 'Erro ao exportar banco de dados.' });
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Exporta o estoque do usuário logado em Excel.
   */
  static async exportExcel(req, res) {
    try {
      const buffer = await ExportService.generateExcel(req.user.id);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="estoque_produtos.xlsx"');
      res.send(buffer);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      res.status(500).json({ error: 'Erro ao gerar planilha Excel.' });
    }
  }

  /**
   * Exporta o estoque do usuário logado em CSV.
   */
  static async exportCSV(req, res) {
    try {
      const csvData = await ExportService.generateCSV(req.user.id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="estoque_produtos.csv"');
      res.send(csvData);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      res.status(500).json({ error: 'Erro ao gerar arquivo CSV.' });
    }
  }
}

module.exports = ExportController;
