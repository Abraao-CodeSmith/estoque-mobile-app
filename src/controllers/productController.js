const db = require('../config/database');
const fs = require('fs');
const path = require('path');

class ProductController {
  /**
   * Lista todos os produtos do usuário logado, com suporte a busca.
   */
  static getAll(req, res) {
    const { search } = req.query;
    const userId = req.user.id;

    let sql = 'SELECT * FROM estoque WHERE usuario_id = ? ORDER BY id DESC';
    let params = [userId];

    if (search && search.trim() !== '') {
      const queryStr = `%${search.trim()}%`;
      sql = 'SELECT * FROM estoque WHERE usuario_id = ? AND (produto LIKE ? OR codigo LIKE ?) ORDER BY id DESC';
      params = [userId, queryStr, queryStr];
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Erro ao buscar produtos:', err.message);
        return res.status(500).json({ error: 'Erro ao consultar produtos do estoque.' });
      }
      res.json({ success: true, data: rows || [] });
    });
  }

  /**
   * Cadastra um novo produto vinculado ao usuário logado.
   */
  static create(req, res) {
    const { codigo, produto, quantidade, cor } = req.body;
    const userId = req.user.id;
    let imagemPath = '';

    if (req.file) {
      imagemPath = `/uploads/${req.file.filename}`;
    } else if (req.body.imagem) {
      imagemPath = req.body.imagem;
    }

    if (!produto || produto.trim() === '') {
      return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    }

    const qty = parseInt(quantidade, 10) >= 0 ? parseInt(quantidade, 10) : 1;
    const sql = `INSERT INTO estoque (usuario_id, codigo, produto, quantidade, cor, imagem) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [userId, codigo || '', produto.trim(), qty, cor || '', imagemPath];

    db.run(sql, params, function (err) {
      if (err) {
        console.error('Erro ao cadastrar produto:', err.message);
        return res.status(500).json({ error: 'Erro ao salvar o produto no banco de dados.' });
      }

      db.get('SELECT * FROM estoque WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(201).json({ success: true, id: this.lastID });
        res.status(201).json({ success: true, data: row });
      });
    });
  }

  /**
   * Exclui um produto — valida que pertence ao usuário logado.
   */
  static delete(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    db.get('SELECT * FROM estoque WHERE id = ? AND usuario_id = ?', [id, userId], (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar produto.' });
      if (!row) return res.status(404).json({ error: 'Produto não encontrado.' });

      // Remove imagem local se existir
      if (row.imagem && row.imagem.startsWith('/uploads/')) {
        const fullPath = path.resolve(__dirname, '../../public', row.imagem.slice(1));
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (unlinkErr) => {
            if (unlinkErr) console.warn('Aviso: Não foi possível apagar a imagem:', unlinkErr.message);
          });
        }
      }

      db.run('DELETE FROM estoque WHERE id = ? AND usuario_id = ?', [id, userId], function (err) {
        if (err) {
          console.error('Erro ao deletar produto:', err.message);
          return res.status(500).json({ error: 'Erro ao remover produto.' });
        }
        res.json({ success: true, message: 'Produto removido com sucesso.' });
      });
    });
  }

  /**
   * Atualiza um produto — valida que pertence ao usuário logado.
   */
  static update(req, res) {
    const { id } = req.params;
    const { codigo, produto, quantidade, cor } = req.body;
    const userId = req.user.id;

    if (!produto || produto.trim() === '') {
      return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    }

    const qty = parseInt(quantidade, 10) >= 0 ? parseInt(quantidade, 10) : 1;

    db.get('SELECT * FROM estoque WHERE id = ? AND usuario_id = ?', [id, userId], (err, existingRow) => {
      if (err || !existingRow) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }

      let imagemPath = existingRow.imagem || '';
      if (req.file) {
        // Remove imagem antiga para economizar espaço
        if (existingRow.imagem && existingRow.imagem.startsWith('/uploads/')) {
          const oldPath = path.resolve(__dirname, '../../public', existingRow.imagem.slice(1));
          if (fs.existsSync(oldPath)) {
            fs.unlink(oldPath, (e) => {
              if (e) console.warn('Aviso: Não foi possível apagar imagem antiga:', e.message);
            });
          }
        }
        imagemPath = `/uploads/${req.file.filename}`;
      } else if (req.body.imagem !== undefined) {
        imagemPath = req.body.imagem;
      }

      const sql = `UPDATE estoque SET codigo = ?, produto = ?, quantidade = ?, cor = ?, imagem = ? WHERE id = ? AND usuario_id = ?`;
      const params = [codigo || '', produto.trim(), qty, cor || '', imagemPath, id, userId];

      db.run(sql, params, function (updateErr) {
        if (updateErr) {
          console.error('Erro ao atualizar produto:', updateErr.message);
          return res.status(500).json({ error: 'Erro ao atualizar produto no banco de dados.' });
        }

        db.get('SELECT * FROM estoque WHERE id = ?', [id], (getErr, updatedRow) => {
          res.json({ success: true, data: updatedRow });
        });
      });
    });
  }
}

module.exports = ProductController;
