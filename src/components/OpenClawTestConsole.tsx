import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Send,
  Copy,
  Check,
  FileCode,
  Users,
  RefreshCw,
  Cpu,
  Terminal,
} from 'lucide-react';
import { OpenClawConfig, Script } from '../types/script';

interface OpenClawTestConsoleProps {
  config: OpenClawConfig;
  onUpdateConfig: (config: OpenClawConfig) => void;
  onSelectScriptToPlay: (script: Script) => void;
  scripts: Script[];
}

export const OpenClawTestConsole: React.FC<OpenClawTestConsoleProps> = ({
  config,
  onUpdateConfig,
  onSelectScriptToPlay,
  scripts,
}) => {
  const [serverUrl, setServerUrl] = useState(config.serverUrl || 'http://47.90.189.59:17293');
  const [token, setToken] = useState(config.apiToken || '');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<any>(null);

  // Chat test
  const [selectedAgent, setSelectedAgent] = useState('detective');
  const [testPrompt, setTestPrompt] = useState('李探长，沈老爷在紧锁的书房遇害，现场唯一的茶盏中发现了砒霜，请发表你的现场观察！');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatResponse, setChatResponse] = useState<any>(null);

  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedBash, setCopiedBash] = useState(false);

  // Find the Shen Mansion script matching openclaw.json
  const shenScript = scripts.find((s) => s.id === 'script-shen-mansion') || scripts[0];

  // Auto probe on first mount
  useEffect(() => {
    runProbe();
  }, []);

  const runProbe = async () => {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch(`/api/openclaw/probe?url=${encodeURIComponent(serverUrl)}&token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setProbeResult(data);
    } catch (e: any) {
      setProbeResult({ error: e.message });
    } finally {
      setProbing(false);
    }
  };

  const handleSendTestChat = async () => {
    setSendingChat(true);
    setChatResponse(null);
    try {
      const res = await fetch('/api/openclaw/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl,
          token,
          agentId: selectedAgent,
          message: testPrompt,
          model: selectedAgent === 'main' ? 'openclaw' : `openclaw/${selectedAgent}`,
        }),
      });
      const data = await res.json();
      setChatResponse({
        status: res.status,
        data,
      });
    } catch (err: any) {
      setChatResponse({
        error: err.message,
      });
    } finally {
      setSendingChat(false);
    }
  };

  // Example openclaw.json snippet to append new agents
  const newAgentSnippet = `{
  "id": "charles",
  "workspace": "/home/admin/.openclaw/workspace_charles",
  "identity": {
    "name": "查尔斯医生",
    "emoji": "🩺"
  },
  "subagents": {
    "allowAgents": ["main", "detective", "wife", "butler", "son", "guest", "charles"]
  }
}`;

  const bashScript = `# 1. 登录阿里云服务器
ssh admin@47.90.189.59

# 2. 为新 Agent 创建独立工作目录
mkdir -p /home/admin/.openclaw/workspace_charles

# 3. 编辑 openclaw.json
nano /home/admin/.openclaw/openclaw.json
# 将生成的 Agent JSON 添加到 "agents.list" 数组中

# 4. 重载或重启 OpenClaw 服务生效
systemctl restart openclaw # 或 openclaw reload`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400 mb-1">
            <Server className="w-4 h-4" />
            <span>阿里云轻量服务器 · OpenClaw 专属联调控制台</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-serif">
            OpenClaw 实例探测与 openclaw.json 角色联调
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            诊断目标主机 47.90.189.59:17293 端口健康状态、API 路由，并为您已有的 7 位 Agent 角色提供直连推演。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectScriptToPlay(shenScript)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>开启《沈府疑云》专属推演</span>
          </button>
        </div>
      </div>

      {/* Grid: 1. Live probe / 2. Why openclaw.json doesn't auto-update */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Live Server Health Probe */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-serif">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>实时服务探测 (47.90.189.59:17293)</span>
            </h3>
            <button
              onClick={runProbe}
              disabled={probing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
              <span>{probing ? '探测中...' : '重新探测'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  健康探针 (GET /health)
                </span>
                {probeResult?.endpoints?.health ? (
                  probeResult.endpoints.health.statusCode === 200 ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>HTTP 200 在线 (live)</span>
                    </div>
                  ) : (
                    <div className="text-amber-400">
                      HTTP {probeResult.endpoints.health.statusCode}
                    </div>
                  )
                ) : probing ? (
                  <span className="text-slate-500">检测中...</span>
                ) : (
                  <span className="text-slate-500">待检测</span>
                )}
                {probeResult?.endpoints?.health?.body && (
                  <pre className="mt-1 font-mono text-[10px] text-slate-400">
                    {JSON.stringify(probeResult.endpoints.health.body)}
                  </pre>
                )}
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  模型网关 (GET /v1/models)
                </span>
                {probeResult?.endpoints?.models ? (
                  probeResult.endpoints.models.statusCode === 401 ? (
                    <div className="text-amber-400/90 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>401 需提供 Bearer Token</span>
                    </div>
                  ) : (
                    <div className="text-emerald-400">
                      HTTP {probeResult.endpoints.models.statusCode}
                    </div>
                  )
                ) : probing ? (
                  <span className="text-slate-500">检测中...</span>
                ) : (
                  <span className="text-slate-500">待检测</span>
                )}
                <span className="text-[10px] text-slate-500 block mt-1">
                  用于接入 qwen3.7-plus 推理
                </span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                OpenClaw 认证 Token（如您的 openclaw.json 配置了鉴权）：
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  onUpdateConfig({ ...config, apiToken: e.target.value });
                }}
                placeholder="Bearer Token（若无则留空）"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Mechanism Explanation */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-serif">
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>为什么 openclaw.json 中没有自动新增 Agent？</span>
          </h3>

          <div className="space-y-2.5 text-slate-300 leading-relaxed">
            <p>
              1. <strong>静态配置机制</strong>：OpenClaw 服务启动时，会一次性从磁盘读取 <code className="text-amber-300 font-mono text-[11px]">openclaw.json</code> 文件，并初始化其内部的 subagents。
            </p>
            <p>
              2. <strong>外部权限隔离</strong>：出于 Linux 服务器安全策略，OpenClaw 的 HTTP API <strong>不会向外部暴露直接修改 openclaw.json 磁盘文件</strong> 的接口（防止任意文件覆写与安全漏洞）。
            </p>
            <p>
              3. <strong>关键发现：您已拥有现成的剧本角色！</strong>
              您配置的 <code className="text-amber-300 font-mono text-[11px]">openclaw.json</code> 中，其实已经配置好了一套极具特色的 7 位角色：
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="text-slate-300">🕵️ detective: 李探长</div>
            <div className="text-slate-300">💃 wife: 沈夫人</div>
            <div className="text-slate-300">🗡️ butler: 管家老陈</div>
            <div className="text-slate-300">👦 son: 沈少爷</div>
            <div className="text-slate-300">🎩 guest: 李先生</div>
            <div className="text-slate-300">🏮 shenlaoye: 沈老爷</div>
            <div className="text-slate-400">⚙️ main: 主控/DM</div>
          </div>
        </div>
      </div>

      {/* Tailored Script Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400">专属角色 100% 匹配</span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">无缝衔接您的 openclaw.json</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 font-serif">
            《沈府疑云：暴雨夜密室惨案》
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            本剧本正是为您 openclaw.json 中的 <strong>李探长、沈夫人、管家老陈、沈少爷、李先生、沈老爷</strong> 量身定制。所有角色 ID（detective, wife, butler, son, guest, main）完全匹配您的工作区路径（workspace_detective, workspace_wife...），可直接上阵推演！
          </p>
        </div>

        <button
          onClick={() => onSelectScriptToPlay(shenScript)}
          className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-amber-500/20"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>立即开局推演本剧本</span>
        </button>
      </div>

      {/* Online Chat Gateway Tester */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-serif">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>在线调试：向您的 OpenClaw 网关发送推理请求</span>
          </h3>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
            路由模型：openclaw/{selectedAgent}
          </span>
        </div>

        <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded-lg text-sky-200 text-xs leading-relaxed space-y-1">
          <div className="font-semibold text-sky-300">
            💡 关于报错「Invalid `model`. Use `openclaw` or `openclaw/&lt;agentId&gt;`」的说明：
          </div>
          <p>
            OpenClaw 采用 <strong>虚拟模型路由（Virtual Model Routing）</strong> 机制：在请求中不能直接传底层模型名（如 qwen3.7-plus），而必须传入 <code className="bg-sky-900/60 px-1 py-0.5 rounded font-mono">openclaw/&lt;agentId&gt;</code>（如 <code className="bg-sky-900/60 px-1 py-0.5 rounded font-mono">openclaw/detective</code>）。
            OpenClaw 识别后会自动挂载对应的工作区目录（<code className="font-mono text-[10px]">/home/admin/.openclaw/workspace_detective</code>）并调度您的 <code className="font-mono text-[10px]">qwenprovider/qwen3.7-plus</code> 模型！
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-slate-400 block mb-1">测试目标 Agent：</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
            >
              <option value="detective">李探长 (openclaw/detective)</option>
              <option value="wife">沈夫人 (openclaw/wife)</option>
              <option value="butler">管家老陈 (openclaw/butler)</option>
              <option value="son">沈少爷 (openclaw/son)</option>
              <option value="guest">李先生 (openclaw/guest)</option>
              <option value="shenlaoye">沈老爷 (openclaw/shenlaoye)</option>
              <option value="main">主控调度 (openclaw)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-slate-400 block mb-1">测试推理提问：</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
              />
              <button
                onClick={handleSendTestChat}
                disabled={sendingChat}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingChat ? '请求中...' : '发送测试'}</span>
              </button>
            </div>
          </div>
        </div>

        {chatResponse && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
              <span>网关响应结果：</span>
              <span>HTTP {chatResponse.status || 'ERR'}</span>
            </div>
            <pre className="text-slate-200 overflow-x-auto whitespace-pre-wrap py-1">
              {JSON.stringify(chatResponse.data || chatResponse.error, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Guide: How to manually add a new Agent to openclaw.json */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-serif">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>若您想在 openclaw.json 中添加全新角色，如何操作？</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                1. 复制此 JSON 片段到 openclaw.json 的 agents.list 中：
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newAgentSnippet);
                  setCopiedJson(true);
                  setTimeout(() => setCopiedJson(false), 2000);
                }}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? '已复制' : '复制代码'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto">
              {newAgentSnippet}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                2. 在服务器终端创建工作区目录并重载：
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bashScript);
                  setCopiedBash(true);
                  setTimeout(() => setCopiedBash(false), 2000);
                }}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedBash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBash ? '已复制' : '复制Shell'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto">
              {bashScript}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
