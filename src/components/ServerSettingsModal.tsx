import React, { useState } from 'react';
import { Server, Activity, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Cpu } from 'lucide-react';
import { OpenClawConfig, EngineMode } from '../types/script';

interface ServerSettingsModalProps {
  config: OpenClawConfig;
  onSaveConfig: (config: OpenClawConfig) => void;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  config,
  onSaveConfig,
  onClose,
}) => {
  const [serverUrl, setServerUrl] = useState(config.serverUrl || 'http://47.98.120.88:8000');
  const [wsUrl, setWsUrl] = useState(config.wsUrl || 'ws://47.98.120.88:8000/ws');
  const [apiToken, setApiToken] = useState(config.apiToken || '');
  const [engineMode, setEngineMode] = useState<EngineMode>(config.engineMode);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string;
    msg: string;
    latency?: number;
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();

    try {
      const res = await fetch(`/api/openclaw/ping?url=${encodeURIComponent(serverUrl)}`);
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      if (data.status === 'connected') {
        setTestResult({
          status: 'success',
          msg: `成功连通阿里云轻量服务器 OpenClaw (HTTP ${data.statusCode})`,
          latency: elapsed,
        });
      } else if (data.status === 'unreachable') {
        setTestResult({
          status: 'warn',
          msg: `远程实例暂未响应 (${data.error || '连接超时'})。建议检查安全组端口或使用内置高可用协同引擎。`,
        });
      } else {
        setTestResult({
          status: 'success',
          msg: `本地/内置推演引擎就绪，支持立即全流程推演`,
          latency: elapsed,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'warn',
        msg: `服务探测异常: ${err.message || '网络无法直连'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      serverUrl,
      wsUrl,
      apiToken,
      engineMode,
      status: testResult?.status === 'success' ? 'connected' : 'simulated',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-serif">
                阿里云轻量服务器 · OpenClaw 配置
              </h3>
              <p className="text-[11px] text-slate-400">
                连接您的云端 OpenClaw 多智能体路由服务
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              OpenClaw 服务 HTTP 地址
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://<阿里云轻量服务器公网IP>:8000"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-400 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              请确保阿里云轻量服务器控制台防火墙已放行对应端口（如 8000 或 8080）。
            </span>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              WebSocket 实时消息通信地址
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://<阿里云轻量服务器公网IP>:8000/ws"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              OpenClaw API 访问密钥 (可选)
            </label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Bearer Token 或留空使用免密内网通道"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Test results banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs leading-relaxed ${
                testResult.status === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                {testResult.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>探测结果</span>
                {testResult.latency !== undefined && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    (耗时 {testResult.latency}ms)
                  </span>
                )}
              </div>
              <p>{testResult.msg}</p>
            </div>
          )}

          {/* OpenClaw Workspace & Agent Role Creation Details */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>OpenClaw 工作目录角色创建机制</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setServerUrl('http://47.90.189.59:17293');
                  setWsUrl('ws://47.90.189.59:17293/ws');
                }}
                className="text-[10px] text-amber-400/90 hover:text-amber-300 underline"
              >
                填入 47.90.189.59:17293
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              当您配置并启动推演时，本应用会向您的 OpenClaw 服务端发送剧本角色初始化请求（包含独立的 System Prompt、记忆隔离作用域与人设设定）。
              OpenClaw 收到请求后，将在服务器工作目录（如 <code className="text-amber-300 font-mono text-[10px]">~/.openclaw/workspace/</code>）下自动为每位角色创建独立的数据空间。
            </p>

            <div className="p-2 bg-slate-900 rounded border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold">📁 服务端生成的工作目录结构预览：</div>
              <div>├── workspace/sessions/script-clocktower-blizzard/</div>
              <div>│   ├── char-adrian-dm/ (DM主持 Agent 记忆与规则)</div>
              <div>│   ├── char-alex-detective/ (侦探 Agent 证据分析与推理日志)</div>
              <div>│   ├── char-charles-killer/ (真凶 Agent 秘密伪装与答辩记忆)</div>
              <div>│   └── char-victoria/ / char-bernard/ / char-lillian/ ...</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? '正在探测连通性...' : '测试 47.90.189.59 连通性'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
