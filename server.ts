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
  const targetUrl = (req.query.url as string) || 'http://47.90.189.59:17293';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    // Probe /health endpoint which OpenClaw natively supports
    const healthUrl = targetUrl.replace(/\/+$/, '') + '/health';
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json().catch(() => null);

    return res.json({
      status: 'connected',
      targetUrl,
      healthUrl,
      statusCode: response.status,
      healthData: data,
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

// 1.1 Direct deep probe for OpenClaw test page
app.get('/api/openclaw/probe', async (req, res) => {
  const serverUrl = (req.query.url as string) || 'http://47.90.189.59:17293';
  const token = req.query.token as string;

  const results: any = {
    serverUrl,
    timestamp: Date.now(),
    endpoints: {},
  };

  // Test /health
  try {
    const ctrl1 = new AbortController();
    const t1 = setTimeout(() => ctrl1.abort(), 3000);
    const r1 = await fetch(`${serverUrl.replace(/\/+$/, '')}/health`, { signal: ctrl1.signal });
    clearTimeout(t1);
    results.endpoints.health = {
      statusCode: r1.status,
      body: await r1.json().catch(() => null),
    };
  } catch (e: any) {
    results.endpoints.health = { error: e.message };
  }

  // Test /v1/models
  try {
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 3000);
    const r2 = await fetch(`${serverUrl.replace(/\/+$/, '')}/v1/models`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: ctrl2.signal,
    });
    clearTimeout(t2);
    results.endpoints.models = {
      statusCode: r2.status,
      body: await r2.json().catch(() => null),
    };
  } catch (e: any) {
    results.endpoints.models = { error: e.message };
  }

  return res.json(results);
});

// 1.2 Test Chat Completions against OpenClaw gateway
app.post('/api/openclaw/test-chat', async (req, res) => {
  const { serverUrl = 'http://47.90.189.59:17293', token, model, message, agentId, systemPrompt } = req.body;

  // OpenClaw routes to specific subagents strictly via model name: "openclaw/<agentId>" or "openclaw"
  // Even if user passed a provider name like 'qwenprovider/...', map it to openclaw/<agentId>
  let targetModel = 'openclaw';
  if (model && model.startsWith('openclaw/')) {
    targetModel = model;
  } else if (agentId && agentId !== 'main') {
    targetModel = `openclaw/${agentId}`;
  } else if (model === 'openclaw') {
    targetModel = 'openclaw';
  }

  try {
    const controller = new AbortController();
    // Allow up to 120 seconds for deep reasoning models (like qwen3.7-plus) to think and respond
    const timeout = setTimeout(() => controller.abort(), 120000);

    const chatUrl = `${serverUrl.replace(/\/+$/, '')}/v1/chat/completions`;
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt || `你正在参与剧本杀推演。你当前的身份是Agent：${agentId || '李探长'}。请以第一人称简短发言。`,
          },
          {
            role: 'user',
            content: message || '请发表你的现场观察与发言。',
          },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({
      error: `OpenClaw 请求失败: ${err.message}`,
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

// 2.1 OpenClaw Batch Agent Initialization & Workspace Sync
app.post('/api/openclaw/init-agents', async (req, res) => {
  const { serverUrl, apiToken, script } = req.body;

  if (!script || !script.characters) {
    return res.status(400).json({ error: 'Script and characters are required' });
  }

  // Generate OpenClaw standard multi-agent workspace definition
  const agentDefinitions = script.characters.map((c: any) => ({
    agent_id: c.id,
    name: c.name,
    title: c.title,
    role_type: c.roleType,
    system_prompt: `你正在参与剧本杀《${script.title}》。你的角色是【${c.name}】（${c.title}）。
背景设定：${c.bio}
案发不在场证明：${c.alibi}
${c.isKiller ? '【绝密真凶】你是本案真凶！你的作案动机是：' + (script.truth?.motive || '') + '。请严格隐瞒凶手身份并合理解释！' : '【嫌疑人】你的秘密是：' + (c.secret || '无') + '。请积极自证清白！'}
请以第一人称保持人设进行推理与辩驳，绝不可出戏或泄露自己是AI。`,
    memory: {
      isolation: true,
      scope: `session_${script.id}_${c.id}`,
      persistent: true,
    },
    workspace_dir: `agents/${c.id}`,
    config: {
      temperature: 0.85,
      model: 'qwen-plus', // Default model for Alibaba Cloud OpenClaw
    },
  }));

  // If serverUrl is provided, attempt to dispatch initialization to OpenClaw
  let dispatchResult: any = { dispatched: false };
  if (serverUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const targetEndpoint = `${serverUrl.replace(/\/+$/, '')}/api/agents/init`;

      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          script_id: script.id,
          script_title: script.title,
          agents: agentDefinitions,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const respData = await response.json().catch(() => null);
      dispatchResult = {
        dispatched: true,
        status: response.status,
        response: respData,
      };
    } catch (err: any) {
      dispatchResult = {
        dispatched: false,
        error: err.message,
      };
    }
  }

  return res.json({
    status: 'success',
    serverUrl,
    scriptId: script.id,
    agentsCreatedCount: agentDefinitions.length,
    agents: agentDefinitions,
    dispatchResult,
    workspaceLayout: {
      baseDir: '/root/.openclaw/workspace/ or /opt/openclaw/agents/',
      directories: agentDefinitions.map((a: any) => ({
        path: `workspace/sessions/${script.id}/${a.agent_id}/`,
        files: ['system_prompt.txt', 'memory.json', 'agent_config.json'],
      })),
    },
  });
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
