import { GoogleGenAI } from '@google/genai';

/**
 * Normaliza e inverte placas do padrão de telemetria (ex: '5A80-HBG' -> 'HBG-5A80')
 */
function normalizePlate(raw: string): { normalized: string; original: string } {
  if (!raw) return { normalized: '', original: '' };
  const original = raw.trim();
  let cleaned = original
    .replace(/\s+(C\.?|R\.?|\.{2,}).*$/i, '')
    .replace(/[^A-Za-z0-9\-\/]/g, '')
    .toUpperCase()
    .replace(/\//g, '1');

  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length >= 2) {
      const p1 = parts[0].trim();
      const p2 = parts[1].trim();

      // Invertida: 4 caracteres primeiro, 3 letras depois (ex: 5A80-HBG)
      if (/^[A-Z0-9]{4}$/.test(p1) && /^[A-Z]{3}$/.test(p2)) {
        return { normalized: `${p2}-${p1}`, original };
      }
      // Padrão correto já: 3 letras primeiro, 4 caracteres depois (ex: HBG-5A80)
      if (/^[A-Z]{3}$/.test(p1) && /^[A-Z0-9]{4}$/.test(p2)) {
        return { normalized: `${p1}-${p2}`, original };
      }
      const matchLetters = p2.match(/[A-Z]{3}/);
      if (matchLetters && /^[A-Z0-9]{4}$/.test(p1)) {
        return { normalized: `${matchLetters[0]}-${p1}`, original };
      }
    }
  }

  const pure = cleaned.replace(/[^A-Z0-9]/g, '');
  if (pure.length === 7) {
    const first4 = pure.slice(0, 4);
    const last3 = pure.slice(4);
    if (/^[A-Z]{3}$/.test(last3)) {
      return { normalized: `${last3}-${first4}`, original };
    }
    const first3 = pure.slice(0, 3);
    const last4 = pure.slice(3);
    if (/^[A-Z]{3}$/.test(first3)) {
      return { normalized: `${first3}-${last4}`, original };
    }
  }

  return { normalized: cleaned, original };
}

/**
 * Executa chamada no Gemini com fallback automático entre modelos
 */
async function generateWithFallback(ai: GoogleGenAI, contents: any, systemInstruction?: string): Promise<string> {
  const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: 'application/json',
          ...(systemInstruction ? { systemInstruction } : {}),
        },
      });

      const text = res.text?.trim();
      if (text) {
        return text;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Todos os modelos de IA estão temporariamente ocupados.');
}

function cleanAndParseJson(text: string): any[] {
  if (!text) return [];
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : (parsed.items || [parsed]);
  } catch (e) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        // Fallback falhou
      }
    }
  }
  return [];
}

/**
 * Handler Serverless compatível com Vercel
 */
export default async function handler(req: any, res: any) {
  // Configuração de CORS se necessário
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-vercel',
        },
      },
    });

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const { images, rawText, defaultDate } = body || {};
    const effectiveDate = defaultDate || new Date().toLocaleDateString('pt-BR');

    // 1. Processamento de Imagens (Prints da Telemetria)
    if (images && Array.isArray(images) && images.length > 0) {
      const parts: any[] = [];

      for (const img of images) {
        let base64Data = '';
        let mimeType = 'image/png';

        if (typeof img === 'string') {
          if (img.startsWith('data:')) {
            const matches = img.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              base64Data = matches[2];
            } else {
              base64Data = img.replace(/^data:[^;]+;base64,/, '');
            }
          } else {
            base64Data = img;
          }
        } else if (img && typeof img === 'object' && img.data) {
          base64Data = img.data.replace(/^data:[^;]+;base64,/, '');
          mimeType = img.mimeType || 'image/png';
        }

        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
        }
      }

      const promptText = `Você é um extrator especialista de dados de telemetria e controle de pernoite para frotas de transporte rodoviário de cargas.
Analise detalhadamente a(s) imagem(ns) anexada(s) do sistema de rastreamento/monitoramento e extraia TODOS os veículos e motoristas listados em linhas.

REGRAS OBRIGATÓRIAS:
1. STATUS DA CARGA (Baseado na COR da linha ou descrição):
   - Linha com fundo VERDE (ou ícone verde / '04-Em Viagem' / 'Viagem'): status = "CARREGADO"
   - Linha com fundo CINZA (ou '24-Fim Viag...' / 'Fim de Viagem'): status = "VAZIO"

2. PLACA DO VEÍCULO (INVERSÃO OBRIGATÓRIA):
   - No sistema de monitoramento, as placas estão INVERTIDAS: números/Mercosul primeiro e letras depois (ex: '5A80-HBG', '3183-TCE C.', '0I67-HBN', '4B04-SIT R ...').
   - Você DEVE converter para o padrão brasileiro oficial de placas: LETRAS PRIMEIRO, depois hífen, depois números/Mercosul:
     * '5A80-HBG' -> 'HBG-5A80'
     * '3183-TCE C.' -> 'TCE-3183'
     * '0I67-HBN' -> 'HBN-0167'
     * '7A91-GFO' -> 'GFO-7A91'
     * '4B04-SIT R ...' -> 'SIT-4B04'
     * '4E06-GAE' -> 'GAE-4E06'
     * '4C70-TCB' -> 'TCB-4C70'
     * '4B69-SWT.' -> 'SWT-4B69'
     * '4H82-GFO' -> 'GFO-4H82'
     * '2F53-MDZ' -> 'MDZ-2F53'
     * '5B35-FVB ...' -> 'FVB-5B35'
     * '9J42-EMK ...' -> 'EMK-9J42'
     * '1E68-TXE ...' -> 'TXE-1E68'
     * '0C01-TCB' -> 'TCB-0C01'
     * '4C71-TCB' -> 'TCB-4C71'

3. TIPO DO VEÍCULO:
   - Se o texto indicar 'LS' -> 'LS'
   - Se o texto indicar 'RODOTREM' -> 'RODOTREM'
   - Se indicar 'CONTÉINER', 'CONTEINER' ou 'CONTAINER' -> 'CONTEINER'
   - Se não especificado explicitamente, padrão: 'CONTEINER'.

4. NOME DO MOTORISTA:
   - Extraia o nome completo do condutor associado àquela linha, sem truncar.
   - Converta para MAIÚSCULAS.

5. DATA:
   - Utilize a data fornecida: '${effectiveDate}'.

6. OBSERVAÇÃO:
   - Mantenha sempre como string vazia ("") pois este campo é preenchido manualmente.

Retorne EXCLUSIVAMENTE um array JSON de objetos com os campos:
[
  {
    "data": "${effectiveDate}",
    "placa": "HBG-5A80",
    "placaOriginal": "5A80-HBG",
    "motorista": "CLAYTON JACOB DE OLIVEIRA",
    "tipo": "LS",
    "observacao": "",
    "status": "CARREGADO",
    "operacaoOriginal": "04-Em Viagem OP LS",
    "velocidade": "",
    "localizacao": ""
  }
]`;

      parts.push({ text: promptText });

      const rawJsonText = await generateWithFallback(ai, parts);
      const parsed = cleanAndParseJson(rawJsonText);

      const items = parsed.map((item: any, idx: number) => {
        const { normalized, original } = normalizePlate(item.placaOriginal || item.placa || '');
        return {
          id: `ext-${Date.now()}-${idx}`,
          data: item.data || effectiveDate,
          placa: normalized || item.placa,
          placaOriginal: original || item.placaOriginal || '',
          motorista: (item.motorista || '').toUpperCase().trim(),
          tipo: item.tipo || 'CONTEINER',
          observacao: item.observacao || '',
          status: item.status === 'VAZIO' ? 'VAZIO' : 'CARREGADO',
          operacaoOriginal: item.operacaoOriginal || '',
          velocidade: item.velocidade || '',
          localizacao: item.localizacao || '',
        };
      });

      return res.status(200).json({
        success: true,
        items,
        source: 'vision',
        sourceImageCount: images.length,
        detectedDate: effectiveDate,
      });
    }

    // 2. Processamento por texto bruto
    if (rawText && typeof rawText === 'string') {
      const prompt = `Analise este texto extraído de tela de telemetria de frota e extraia cada veículo em JSON:
${rawText}

REGRAS:
- Inverter placas: '5A80-HBG' -> 'HBG-5A80', '3183-TCE C.' -> 'TCE-3183'.
- Identificar status: '04-Em Viagem' = CARREGADO, '24-Fim Viag...' = VAZIO.
- Tipo: CONTEINER, LS ou RODOTREM.
- Data: ${effectiveDate}.
- Observação: vazio ("").
- Motorista: em MAIÚSCULAS.

Retorne um array JSON com os campos: data, placa, placaOriginal, motorista, tipo, observacao, status, operacaoOriginal, velocidade, localizacao.`;

      const rawJsonText = await generateWithFallback(ai, prompt);
      const parsed = cleanAndParseJson(rawJsonText);
      const items = parsed.map((item: any, idx: number) => {
        const { normalized, original } = normalizePlate(item.placaOriginal || item.placa || '');
        return {
          id: `text-${Date.now()}-${idx}`,
          data: item.data || effectiveDate,
          placa: normalized || item.placa,
          placaOriginal: original,
          motorista: (item.motorista || '').toUpperCase().trim(),
          tipo: item.tipo || 'CONTEINER',
          observacao: item.observacao || '',
          status: item.status || 'CARREGADO',
          operacaoOriginal: item.operacaoOriginal || '',
          velocidade: item.velocidade || '',
          localizacao: item.localizacao || '',
        };
      });

      return res.status(200).json({ success: true, items, source: 'text' });
    }

    return res.status(400).json({ error: 'Nenhuma imagem ou texto foi fornecido para extração.' });
  } catch (error: any) {
    console.error('Erro na extração serverless:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar extração com Inteligência Artificial.',
    });
  }
}
