import React from 'react';
import { Play, BookOpen, Server, Sparkles, CheckCircle2, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { Script, OpenClawConfig } from '../types/script';

interface HomeViewProps {
  scripts: Script[];
  openclawConfig: OpenClawConfig;
  onSelectScriptToPlay: (script: Script) => void;
  onOpenCreateRoom: () => void;
  onOpenServerSettings: () => void;
  onGoToScripts: () => void;
  onGoToGuide: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  scripts,
  openclawConfig,
  onSelectScriptToPlay,
  onOpenCreateRoom,
  onOpenServerSettings,
  onGoToScripts,
  onGoToGuide,
}) => {
  const featuredScript = scripts[0];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/mystery_mansion_hero_1791266306149.jpg"
            alt="Mansion Library Murder Mystery"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
        </div>

        <div className="relative z-10 max-w-3xl p-8 sm:p-12 space-y-6">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
            <span>OpenClaw 多智能体框架</span>
            <span aria-hidden="true">·</span>
            <span>无感旁观模式</span>
            <span aria-hidden="true">·</span>
            <span>6阶段自主流转</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 text-balance leading-tight font-serif">
            多智能体剧本杀观摩系统
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
            后端依托部署在阿里云轻量服务器上的 OpenClaw 多智能体路由，由 AI 主持人、侦探与多位嫌疑人自主登台博弈。
            从暴风雪封门开局，到搜证、对质激辩、匿名密投，直至终局真相复盘 —— 全程由 AI 自主推演，为您呈现一场沉浸式推理盛宴。
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onSelectScriptToPlay(featuredScript)}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-lg shadow-amber-500/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>启动《{featuredScript?.title || '经典剧本'}》推演</span>
            </button>

            <button
              onClick={onOpenCreateRoom}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>挑选剧本房间</span>
            </button>

            <button
              onClick={onOpenServerSettings}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Server className="w-4 h-4" />
              <span>服务器设置</span>
            </button>
          </div>
        </div>
      </section>

      {/* Server & Engine Status Bar */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  阿里云轻量服务器 OpenClaw 多Agent服务
                </h3>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      openclawConfig.status === 'connected'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  {openclawConfig.status === 'connected'
                    ? '远程已连接'
                    : '智能协同推演就绪'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                独立角色记忆隔离 · 阶段事件消息总线 · 支持配置阿里云远程 IP/端口 或使用内置高性能推演引擎
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenServerSettings}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
            >
              配置服务器连接
            </button>
          </div>
        </div>
      </section>

      {/* Featured Scripts Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-100 font-serif">
              精选可推演剧本库
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              每个剧本均具备完整人物设定、隐秘动机、阶段线索池与严谨凶案闭环，可立即跑通完整一轮
            </p>
          </div>
          <button
            onClick={onGoToScripts}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>管理全部剧本</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="group rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700 transition-all p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{script.playerCount} 位角色</span>
                    <span aria-hidden="true">·</span>
                    <span>{script.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>{script.clues.length} 个线索物证</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {script.tags.join(' / ')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors font-serif">
                  {script.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {script.summary}
                </p>

                {/* Character roster preview */}
                <div className="pt-2">
                  <div className="text-[11px] text-slate-400 mb-1.5">登场角色：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {script.characters.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60"
                      >
                        {c.name}
                        <span className="text-slate-500 text-[10px] ml-1">({c.title})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-slate-800/80 mt-6">
                <span className="text-xs text-slate-500">
                  包含6阶段完整流程
                </span>

                <button
                  onClick={() => onSelectScriptToPlay(script)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>立即启动AI推演</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spectator Experience Guide */}
      <section className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-100 font-serif">
          观摩模式运转机制
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-amber-400">01. 零操作静观</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              用户无需扮演任何角色，无需回复、搜证或投票。端坐观摩，全面审视所有AI角色的辩词与博弈。
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-amber-400">02. 上帝视角全开</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI角色之间的公开辩论、已解锁的物证线索，以及私聊耳语，观众均可尽收眼底。真凶身份直至终局复盘前严格保密。
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-amber-400">03. 节奏随心掌控</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              支持暂停、继续推演与单步逐步推进；可调节推演语速，推演完毕后支持一键导出整场对白与推理笔录。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
