import React, { useState } from 'react';
import { Play, Sparkles, Server, Cpu, Shield, MessageCircle } from 'lucide-react';
import { Script, EngineMode, OpenClawConfig } from '../types/script';

interface RoomCreateModalProps {
  scripts: Script[];
  selectedScriptId?: string;
  openclawConfig: OpenClawConfig;
  onClose: () => void;
  onStartDeduction: (
    script: Script,
    engineMode: EngineMode,
    speed: 'slow' | 'normal' | 'fast',
    allowPrivateChat: boolean
  ) => void;
}

export const RoomCreateModal: React.FC<RoomCreateModalProps> = ({
  scripts,
  selectedScriptId,
  openclawConfig,
  onClose,
  onStartDeduction,
}) => {
  const [chosenScriptId, setChosenScriptId] = useState(
    selectedScriptId || scripts[0]?.id || ''
  );
  const [engineMode, setEngineMode] = useState<EngineMode>(
    openclawConfig.engineMode || 'LOCAL_AUTONOMOUS'
  );
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [allowPrivateChat, setAllowPrivateChat] = useState(true);

  const currentScript =
    scripts.find((s) => s.id === chosenScriptId) || scripts[0];

  const handleLaunch = () => {
    if (!currentScript) return;
    onStartDeduction(currentScript, engineMode, speed, allowPrivateChat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 font-serif">
              创建 AI 剧本杀推演房间
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              配置推演剧本与 Agent 参数，由 AI 全程自主开局并完成完整一轮
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Script selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              1. 选择推演剧本
            </label>
            <select
              value={chosenScriptId}
              onChange={(e) => setChosenScriptId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  《{s.title}》· {s.playerCount}人本 · {s.difficulty}
                </option>
              ))}
            </select>

            {currentScript && (
              <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-amber-400 block mb-1">
                  案件速览：
                </span>
                {currentScript.summary}
              </div>
            )}
          </div>

          {/* Engine Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              2. Agent 调度驱动引擎
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEngineMode('REMOTE_OPENCLAW')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  engineMode === 'REMOTE_OPENCLAW'
                    ? 'bg-amber-400/10 border-amber-400 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  <span>阿里云 OpenClaw</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  轻量应用服务器专线路由
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEngineMode('GEMINI_AI')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  engineMode === 'GEMINI_AI'
                    ? 'bg-amber-400/10 border-amber-400 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gemini 云端引擎</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  动态大模型推理与辩驳
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEngineMode('LOCAL_AUTONOMOUS')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  engineMode === 'LOCAL_AUTONOMOUS'
                    ? 'bg-amber-400/10 border-amber-400 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>自主协同引擎</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  即开即推 · 100%跑通
                </div>
              </button>
            </div>
          </div>

          {/* Speed & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                3. AI 发言节奏速度
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {(['slow', 'normal', 'fast'] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeed(spd)}
                    className={`py-1 rounded text-center transition-colors ${
                      speed === spd
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd === 'slow' ? '慢速 (3s)' : spd === 'normal' ? '中速 (2s)' : '快速 (1s)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                4. 角色私聊与密谋
              </label>
              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={allowPrivateChat}
                  onChange={(e) => setAllowPrivateChat(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                />
                <span>允许 AI 角色私聊密谋（观众可见）</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            取消
          </button>
          <button
            onClick={handleLaunch}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>立即启动推演房间</span>
          </button>
        </div>
      </div>
    </div>
  );
};
