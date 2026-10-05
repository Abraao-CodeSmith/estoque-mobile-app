const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const db = require('../config/database');

class ExportService {
  /**
   * Obtém produtos do banco filtrando por usuario_id.
   */
  static getProductsFromDB(userId) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM estoque WHERE usuario_id = ? ORDER BY id DESC', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static getDBFilePath() {
    const dbPath = path.resolve(__dirname, '../../database.db');
    if (!fs.existsSync(dbPath)) {
      throw new Error('Arquivo de banco de dados não encontrado.');
    }
    return dbPath;
  }

  static async generateExcel(userId) {
    const products = await this.getProductsFromDB(userId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Estoque Mobile';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Estoque');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Produto', key: 'produto', width: 30 },
      { header: 'Quantidade', key: 'quantidade', width: 14 },
      { header: 'Cor', key: 'cor', width: 15 },
      { header: 'Data de Cadastro', key: 'created_at', width: 22 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F46E5' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    products.forEach((p) => {
      worksheet.addRow({
        id: p.id,
        codigo: p.codigo || '',
        produto: p.produto || '',
        quantidade: p.quantidade || 0,
        cor: p.cor || '',
        created_at: p.created_at || ''
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle' };
        row.getCell('id').alignment = { horizontal: 'center' };
        row.getCell('codigo').alignment = { horizontal: 'center' };
        row.getCell('quantidade').alignment = { horizontal: 'right' };
        row.getCell('cor').alignment = { horizontal: 'center' };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  static async generateCSV(userId) {
    const products = await this.getProductsFromDB(userId);
    const fields = ['id', 'codigo', 'produto', 'quantidade', 'cor', 'created_at'];
    const opts = { fields, delimiter: ';' };

    try {
      const parser = new Parser(opts);
      const csv = parser.parse(products);
      return '\uFEFF' + csv;
    } catch (err) {
      let csv = '\uFEFFID;Código;Produto;Quantidade;Cor;CriadoEm\n';
      products.forEach((p) => {
        csv += `${p.id};"${p.codigo || ''}";"${p.produto || ''}";${p.quantidade || 0};"${p.cor || ''}";"${p.created_at || ''}"\n`;
      });
      return csv;
    }
  }
}

module.exports = ExportService;
