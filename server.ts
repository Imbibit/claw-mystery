import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK if API key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. OpenClaw Server Health & Ping API
app.get('/api/openclaw/ping', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.json({
      status: 'ok',
      engine: 'Built-in OpenClaw Multi-Agent Orchestrator',
      hasGemini: !!aiClient,
      timestamp: Date.now(),
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return res.json({
      status: 'connected',
      targetUrl,
      statusCode: response.status,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return res.json({
      status: 'unreachable',
      targetUrl,
      error: error.message || 'Connection timed out or network error',
      timestamp: Date.now(),
    });
  }
});

// 2. OpenClaw Proxy API to avoid browser CORS when reaching user's Alibaba Cloud instance
app.post('/api/openclaw/proxy', async (req, res) => {
  const { targetUrl, method = 'POST', headers = {}, body } = req.body;
  if (!targetUrl) {
    return res.status(400).json({ error: 'targetUrl is required' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const fetchRes = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = fetchRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await fetchRes.json();
      return res.status(fetchRes.status).json(data);
    } else {
      const text = await fetchRes.text();
      return res.status(fetchRes.status).send(text);
    }
  } catch (error: any) {
    return res.status(502).json({
      error: `Failed to proxy to OpenClaw: ${error.message}`,
    });
  }
});

// 3. Server-side Agent turn generation powered by Gemini (for high-fidelity script deduction)
app.post('/api/ai/agent-turn', async (req, res) => {
  const {
    stage,
    characterName,
    roleType,
    characterSecret,
    alibi,
    isKiller,
    scriptTitle,
    scriptBackground,
    recentMessages,
    unlockedClues,
  } = req.body;

  if (!aiClient) {
    return res.status(503).json({
      error: 'Gemini API not configured on server. Fallback to rule engine.',
    });
  }

  try {
    const systemPrompt = `你现在正在参与一场沉浸式剧本杀《${scriptTitle}》。
你扮演的角色是【${characterName}】（类型：${roleType}${isKiller ? '，真相：你是真凶' : ''}）。
你的秘密信息是：${characterSecret || '无特定隐瞒'}。
你的案发不在场证明/行踪：${alibi || '正常活动'}。
当前游戏阶段：【${stage}】。
已公布的公共线索：${JSON.stringify(unlockedClues || [])}。

【角色指导原则】：
1. 严格以【${characterName}】的身份与第一人称发言，说话语气符合人设。
2. 如果是真凶，务必隐瞒关键作案细节，合理甩锅或提出看似客观的怀疑，绝不直接承认！
3. 如果是侦探，言辞犀利，紧扣已知线索，指出逻辑矛盾。
4. 如果是普通嫌疑人，保护自己的私人隐私，但积极洗脱嫌疑并追问疑点。
5. 发言内容精炼有力，长度控制在50~120字之间，富于戏剧张力，切勿出戏或提及"AI"、"大模型"。
`;

    const userPrompt = `最近的发言记录如下：
${(recentMessages || []).slice(-6).map((m: any) => `${m.senderName}: ${m.content}`).join('\n')}

请作为【${characterName}】，根据当前阶段【${stage}】发表你的一段简短发言：`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.85,
      },
    });

    const speech = response.text?.trim() || '......我正在仔细梳理刚才所有的证词。';
    return res.json({ speech });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Generation failed',
    });
  }
});

// Vite middleware mounting in development, or static hosting in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Claw Murder Mystery Server running at http://localhost:${port}`);
  });
}

startServer();
