import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Invert and normalize license plates from the telemetry display (e.g. "5A80-HBG" -> "HBG-5A80")
 */
function normalizePlateBackend(raw: string): { normalized: string; original: string } {
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

      // Inverted: 4 chars first, 3 letters second
      if (/^[A-Z0-9]{4}$/.test(p1) && /^[A-Z]{3}$/.test(p2)) {
        return { normalized: `${p2}-${p1}`, original };
      }
      // Already correct: 3 letters first, 4 chars second
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
 * Generate content using Gemini with automatic model fallback
 * to handle temporary 503 high-demand spikes or quota issues.
 */
async function generateWithFallback(ai: GoogleGenAI, contents: any, systemInstruction?: string): Promise<string> {
  const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[Gemini] Attempting extraction with model: ${model}`);
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
        console.log(`[Gemini] Extraction succeeded with model: ${model} (${text.length} chars)`);
        return text;
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} failed: ${err.message?.slice(0, 120)}`);
      lastError = err;
    }
  }

  throw lastError || new Error('Todos os modelos de IA estão temporariamente ocupados. Tente novamente em alguns instantes.');
}

function cleanAndParseJson(text: string): any[] {
  if (!text) return [];
  let cleaned = text.trim();
  
  // Remove markdown code fences if present
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
        console.error('Regex JSON slice parse failed:', innerErr);
      }
    }
  }
  return [];
}

async function startServer() {
  const app = express();

  // Allow larger payloads for high-resolution telemetry screenshots
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // Extraction endpoint via Gemini Vision or Text parser
  app.post('/api/extract', async (req, res) => {
    try {
      const { images, rawText, defaultDate } = req.body;
      const effectiveDate = defaultDate || new Date().toLocaleDateString('pt-BR');

      // 1. If images are provided, use Gemini Vision with multi-model fallback
      if (images && Array.isArray(images) && images.length > 0) {
        const ai = getGeminiClient();

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
     * '8E89-TCI C' -> 'TCI-8E89'
     * '3143-EDT C.' -> 'EDT-3143'
   - Guarde a placa original lida no campo 'placaOriginal'.

3. NOME DO MOTORISTA:
   - Nome completo em letras MAIÚSCULAS (ex: 'CLAYTON JACOB DE OLIVEIRA', 'CLEISON TORRES'). Remova pontos de abreviação desnecessários se possível.

4. TIPO DO VEÍCULO:
   - Identifique pela descrição da operação (ex: 'OP CONTÉINER...' ou 'OP CONTAINER' -> 'CONTEINER'; 'OP LS' -> 'LS'; 'OP RODOTREM' -> 'RODOTREM').
   - Valores permitidos: "CONTEINER", "LS" ou "RODOTREM". Se não estiver explícito, use "CONTEINER".

5. OBSERVAÇÃO:
   - Deixe como string vazia (""), pois o usuário irá preencher manualmente na planilha do Excel.

6. DATA:
   - Use a data "${effectiveDate}".

7. INFORMAÇÕES ADICIONAIS DE TELEMETRIA:
   - operacaoOriginal: texto completo da coluna de operação (ex: "04-Em Viagem OP LS -")
   - velocidade: se visível (ex: "88 Km/h")
   - localizacao: se visível (ex: "POSTO IRMÃO CAMINHONEIRO")

FORMATO DE RETORNO OBRIGATÓRIO:
Retorne EXCLUSIVAMENTE um array JSON contendo objetos com os campos:
[
  {
    "data": "${effectiveDate}",
    "placa": "HBG-5A80",
    "placaOriginal": "5A80-HBG",
    "motorista": "CLAYTON JACOB DE OLIVEIRA",
    "tipo": "LS",
    "observacao": "",
    "status": "CARREGADO",
    "operacaoOriginal": "04-Em Viagem OP LS -",
    "velocidade": "88 Km/h",
    "localizacao": "POSTO IRMAO"
  }
]`;

        parts.push({ text: promptText });

        const rawJsonText = await generateWithFallback(ai, { parts });
        const parsedItems = cleanAndParseJson(rawJsonText);

        // Post-process with normalizePlateBackend to guarantee 100% adherence to inversion rules
        const finalizedItems = parsedItems.map((item, idx) => {
          const rawPlate = item.placaOriginal || item.placa || '';
          const { normalized, original } = normalizePlateBackend(rawPlate);

          let tipo = (item.tipo || 'CONTEINER').toUpperCase();
          if (tipo.includes('RODO')) tipo = 'RODOTREM';
          else if (tipo === 'LS') tipo = 'LS';
          else tipo = 'CONTEINER';

          let status = (item.status || 'CARREGADO').toUpperCase();
          if (status.includes('VAZ') || status.includes('FIM') || status.includes('CINZA')) {
            status = 'VAZIO';
          } else {
            status = 'CARREGADO';
          }

          return {
            id: `ai-${Date.now()}-${idx}`,
            data: item.data || effectiveDate,
            placa: normalized || item.placa,
            placaOriginal: original || item.placaOriginal,
            motorista: (item.motorista || '').toUpperCase().trim(),
            tipo,
            observacao: item.observacao || '',
            status,
            operacaoOriginal: item.operacaoOriginal || '',
            velocidade: item.velocidade || '',
            localizacao: item.localizacao || '',
          };
        });

        return res.json({
          success: true,
          items: finalizedItems,
          sourceImageCount: images.length,
          detectedDate: effectiveDate,
        });
      }

      // 2. If rawText is provided (no images or text paste mode)
      if (rawText && typeof rawText === 'string') {
        const ai = getGeminiClient();
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
          const { normalized, original } = normalizePlateBackend(item.placaOriginal || item.placa || '');
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

        return res.json({ success: true, items, source: 'text' });
      }

      return res.status(400).json({ error: 'Nenhuma imagem ou texto foi fornecido para extração.' });
    } catch (error: any) {
      console.error('Error during extraction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar extração com Inteligência Artificial.',
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
