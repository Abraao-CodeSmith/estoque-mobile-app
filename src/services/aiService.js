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

Regras Estritas:
1. Remover e IGNORAR palavras de intenção de comando como "Adicione", "Adicionar", "Cadastrar", "Inserir", "Criar", "Novo". A palavra "Adicione" NUNCA deve fazer parte do nome do produto.
2. A palavra "modelo" ou "código" indica que a palavra/número imediatamente a seguir é o "codigo" do produto (ex: "modelo 3011" -> codigo = "3011", "código X5" -> codigo = "X5").
3. Se houver as expressões "cor única", "única cor", "único", "única", ou se nenhuma cor for dita, defina a cor como "Única".
4. Se disser "cor [nome]" (ex: "cor azul", "cor vermelha"), extraia essa cor.
5. O primeiro número solto ou número no início da frase é a quantidade (padrão 1).

Responda APENAS com um JSON válido:
{"codigo": "código do produto ou string vazia", "produto": "nome limpo do produto", "quantidade": número inteiro (padrão 1), "cor": "cor do produto ou Única"}`;

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
    const prompt = `Analise o texto: "${text}" e extraia um JSON estrito com os campos: codigo (string), produto (string), quantidade (number, default 1), cor (string, default "Única"). Ignorar comandos como "adicione" ou "adicionar". A palavra "modelo" ou "código" define o código do produto. As palavras "único" ou "única" definem cor "Única".`;
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
    const prompt = `Analise o texto: "${text}" e extraia um JSON estrito com os campos: codigo (string), produto (string), quantidade (number, default 1), cor (string, default "Única"). Ignorar comandos como "adicione" ou "adicionar". A palavra "modelo" ou "código" define o código do produto. As palavras "único" ou "única" definem cor "Única".`;
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
   * Parser heurístico local aprimorado com suporte a "modelo", "código", "cor única", "único", "adicione", etc.
   */
  static fallbackRegexParser(rawText) {
    if (!rawText || !rawText.trim()) {
      return { codigo: '', produto: 'Novo Produto', quantidade: 1, cor: 'Única' };
    }

    let text = rawText.trim();

    // 1. Remover comandos de intenção no início ou soltos (ex: "adicione", "adicionar", "cadastrar", etc.)
    text = text.replace(/^(?:adicione|adicionar|cadastrar|incluir|inserir|criar|novo|colocar|por)\s+/i, '');
    text = text.replace(/\b(?:adicione|adicionar|cadastrar|incluir|inserir|criar)\b/gi, '');

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

    let cor = 'Única';

    // 2. Extrair cor única / único / cor padrão se presente
    const unicaMatch = text.match(/\b(?:cor\s+ú?nica|ú?nica\s+cor|ú?nico|ú?nica|cor\s+padr[ãa]o|padr[ãa]o)\b/i);
    if (unicaMatch) {
      cor = 'Única';
      text = text.replace(unicaMatch[0], '');
    } else {
      // 3. Extrair cor por padrão "cor [nome]" ou palavra de cor solta
      const corPrefixMatch = text.match(/\bcor\s+([a-z-áéíóúâêîôûãõç]+)\b/i);
      if (corPrefixMatch) {
        const cleanName = corPrefixMatch[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (colorMap[cleanName]) {
          cor = colorMap[cleanName];
          text = text.replace(corPrefixMatch[0], '');
        }
      }

      if (cor === 'Única') {
        const words = text.split(/\s+/);
        for (const w of words) {
          const cleanW = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (colorMap[cleanW]) {
            cor = colorMap[cleanW];
            text = text.replace(new RegExp(`\\b${w}\\b`, 'i'), '');
            break;
          }
        }
      }
    }

    // 4. Extrair CÓDIGO por palavra-chave ("modelo [cod]", "código [cod]", "ref [cod]", etc.)
    let codigo = '';
    const explicitCodeMatch = text.match(/\b(?:modelo|c[óo]digo|c[óo]d|ref|refer[êe]ncia)\s*[:#-]?\s*([a-z0-9-]+)\b/i);
    if (explicitCodeMatch) {
      codigo = explicitCodeMatch[1];
      text = text.replace(explicitCodeMatch[0], '');
    }

    // 5. Identificar quantidade e código numérico restante se não encontrado acima
    const numberMatches = [...text.matchAll(/\b\d+\b/g)];
    let quantidade = 1;

    if (!codigo) {
      if (numberMatches.length === 1) {
        const match = numberMatches[0];
        if (match.index === 0 || /^\s*\d+/.test(text)) {
          quantidade = parseInt(match[0], 10) || 1;
          text = text.replace(match[0], '');
        } else {
          codigo = match[0];
          text = text.replace(match[0], '');
        }
      } else if (numberMatches.length >= 2) {
        quantidade = parseInt(numberMatches[0][0], 10) || 1;
        codigo = numberMatches[1][0];
        text = text.replace(numberMatches[0][0], '');
        text = text.replace(numberMatches[1][0], '');
      }
    } else {
      // Se código já foi capturado via "modelo X", buscar quantidade no texto
      if (numberMatches.length >= 1) {
        quantidade = parseInt(numberMatches[0][0], 10) || 1;
        text = text.replace(numberMatches[0][0], '');
      }
    }

    // 6. Limpar nome do produto restante
    let produto = text
      .replace(/(?:quantidade|qtd|unidades|un|pe[çc]as|pcs|modelo|c[óo]digo|c[óo]d|ref|n[úu]mero|#)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!produto || produto.length < 2) {
      produto = rawText;
    }

    // Capitalização inicial
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
