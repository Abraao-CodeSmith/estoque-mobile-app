const { GoogleGenAI } = require('@google/genai');
const https = require('https');

/**
 * Service para processamento de áudio/texto utilizando Inteligência Artificial ou Fallback Heurístico Local.
 * Usa o SDK oficial @google/genai para Gemini (mais estável e com suporte a modelos novos).
 */
class AIService {
  static async extractProductData(text) {
    const iaEnabled = process.env.IA_ENABLED === 'true';
    const apiKey = process.env.IA_API_KEY ? process.env.IA_API_KEY.trim() : '';
    const provider = (process.env.IA_PROVIDER || 'gemini').toLowerCase().trim();

    if (!text || typeof text !== 'string') {
      return this.fallbackRegexParser('');
    }

    // Se a IA estiver ativada no .env e houver uma API Key configurada
    if (iaEnabled && apiKey && apiKey !== 'sua_chave_aqui' && apiKey.length > 5) {
      try {
        console.log(`🤖 Processando transcrição via IA (${provider})...`);
        let aiResult = null;

        if (provider === 'gemini') {
          aiResult = await this.callGeminiSDK(text, apiKey);
        } else if (provider === 'openai') {
          aiResult = await this.callOpenAIAPI(text, apiKey);
        } else if (provider === 'groq') {
          aiResult = await this.callGroqAPI(text, apiKey);
        }

        if (aiResult) return aiResult;
      } catch (err) {
        console.warn(`⚠️ Falha ao chamar a API de IA (${provider}): ${err.message}. Utilizando parser de fallback local.`);
      }
    } else {
      console.log('ℹ️ IA desativada (IA_ENABLED=false) ou sem chave. Utilizando parser inteligente local.');
    }

    return this.fallbackRegexParser(text);
  }

  /**
   * Chamada via SDK oficial @google/genai para Gemini.
   * Lê o modelo de IA_MODEL no .env (padrão: gemini-flash-latest).
   */
  static async callGeminiSDK(text, apiKey) {
    const model = (process.env.IA_MODEL || 'gemini-flash-latest').trim();
    console.log(`🔵 Usando modelo Gemini (SDK oficial): ${model}`);

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um assistente de cadastro de estoque. Analise a seguinte transcrição e extraia as informações em formato JSON estrito.
Transcrição: "${text}"

Regras:
1. Ignorar comandos como "adicionar", "cadastrar", "criar", "novo".
2. O primeiro número antes do produto é a quantidade.
3. O número após o produto é o código.
4. Se a cor não for citada, defina como "Única".

Responda APENAS com um JSON válido:
{"codigo": "código do produto ou string vazia", "produto": "nome do produto", "quantidade": número inteiro (padrão 1), "cor": "cor do produto ou Única"}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const responseText = response.text;
    if (!responseText) throw new Error('Resposta vazia da API do Gemini');

    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  /**
   * Chamada HTTP manual para OpenAI
   */
  static async callOpenAIAPI(text, apiKey) {
    const prompt = `Analise o texto: "${text}" e extraia um JSON estrito com os campos: codigo (string), produto (string), quantidade (number, default 1), cor (string, default "Única"). Ignorar comandos como "adicionar".`;
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const responseText = await this.makeHttpPost(url, payload, {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });
    const jsonRes = JSON.parse(responseText);
    const contentText = jsonRes?.choices?.[0]?.message?.content;
    if (!contentText) throw new Error('Resposta vazia da API OpenAI');
    return JSON.parse(contentText);
  }

  /**
   * Chamada HTTP manual para Groq
   */
  static async callGroqAPI(text, apiKey) {
    const prompt = `Analise o texto: "${text}" e extraia um JSON estrito com os campos: codigo (string), produto (string), quantidade (number, default 1), cor (string, default "Única"). Ignorar comandos como "adicionar".`;
    const url = 'https://api.groq.com/api/v1/chat/completions';
    const payload = JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const responseText = await this.makeHttpPost(url, payload, {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });
    const jsonRes = JSON.parse(responseText);
    const contentText = jsonRes?.choices?.[0]?.message?.content;
    if (!contentText) throw new Error('Resposta vazia da API Groq');
    return JSON.parse(contentText);
  }

  static makeHttpPost(urlString, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new Error(`HTTP Status ${res.statusCode}: ${data}`));
        });
      });

      req.on('error', (e) => reject(e));
      req.write(body);
      req.end();
    });
  }

  /**
   * Parser heurístico local com regras específicas do usuário:
   * Exemplo: "Adicionar 300 canetas 3011 preta"
   * - Ignorar "Adicionar"
   * - Primeiro número (300) -> quantidade
   * - Número após produto (3011) -> código
   * - Cor (preta) -> Preta (se não informada -> "Única")
   */
  static fallbackRegexParser(rawText) {
    if (!rawText || !rawText.trim()) {
      return { codigo: '', produto: 'Novo Produto', quantidade: 1, cor: 'Única' };
    }

    let text = rawText.trim();

    // 1. Remover comandos/verbos no início da frase
    text = text.replace(/^(adicionar|cadastrar|incluir|inserir|criar|novo|colocar|por)\s+/i, '');

    const colorMap = {
      'preto': 'Preto', 'preta': 'Preto', 'pretas': 'Preto', 'pretos': 'Preto',
      'azul': 'Azul', 'azuis': 'Azul',
      'vermelho': 'Vermelho', 'vermelha': 'Vermelho', 'vermelhas': 'Vermelho',
      'amarelo': 'Amarelo', 'amarela': 'Amarelo',
      'verde': 'Verde', 'verdes': 'Verde',
      'branco': 'Branco', 'branca': 'Branco', 'brancas': 'Branco',
      'cinza': 'Cinza', 'rosa': 'Rosa', 'roxo': 'Roxo', 'roxa': 'Roxo',
      'bege': 'Bege', 'marrom': 'Marrom', 'laranja': 'Laranja',
      'dourado': 'Dourado', 'prata': 'Prata', 'vinho': 'Vinho'
    };

    let cor = 'Única'; // Cor padrão caso não seja especificada

    // Extrair cor se presente
    const words = text.split(/\s+/);
    for (const w of words) {
      const cleanW = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (colorMap[cleanW]) {
        cor = colorMap[cleanW];
        // Remover a palavra da cor do texto para isolar nome e números
        text = text.replace(new RegExp(`\\b${w}\\b`, 'i'), '');
        break;
      }
    }

    // Identificar números no texto restante
    // Exemplo restante: "300 canetas 3011"
    const numberMatches = [...text.matchAll(/\b\d+\b/g)];
    let quantidade = 1;
    let codigo = '';

    if (numberMatches.length === 1) {
      // Se há apenas 1 número:
      // Se o número estiver no início da frase, é a quantidade. Senão, é o código.
      const match = numberMatches[0];
      if (match.index === 0 || /^^\s*\d+/.test(text)) {
        quantidade = parseInt(match[0], 10) || 1;
        text = text.replace(match[0], '');
      } else {
        codigo = match[0];
        text = text.replace(match[0], '');
      }
    } else if (numberMatches.length >= 2) {
      // Se há 2 ou mais números:
      // O primeiro número é a quantidade, o segundo é o código
      quantidade = parseInt(numberMatches[0][0], 10) || 1;
      codigo = numberMatches[1][0];

      // Remove ambos os números do texto do produto
      text = text.replace(numberMatches[0][0], '');
      text = text.replace(numberMatches[1][0], '');
    }

    // Limpar o nome do produto restante
    let produto = text
      .replace(/(?:quantidade|qtd|unidades|un|pe[çc]as|pcs|c[óo]digo|c[óo]d|ref|n[úu]mero|#)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!produto || produto.length < 2) {
      produto = rawText;
    }

    // Capitalização limpa
    produto = produto.charAt(0).toUpperCase() + produto.slice(1);

    return {
      codigo: codigo || '',
      produto,
      quantidade,
      cor
    };
  }
}

module.exports = AIService;
