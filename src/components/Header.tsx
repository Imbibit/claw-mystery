import React from 'react';
import { Shield, Play, Library, Server, FileText, Activity } from 'lucide-react';
import { OpenClawConfig } from '../types/script';

interface HeaderProps {
  activeTab: 'room' | 'scripts' | 'home' | 'guide';
  setActiveTab: (tab: 'room' | 'scripts' | 'home' | 'guide') => void;
  openclawConfig: OpenClawConfig;
  onOpenServerSettings: () => void;
  onOpenCreateRoom: () => void;
  hasActiveRoom: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openclawConfig,
  onOpenServerSettings,
  onOpenCreateRoom,
  hasActiveRoom,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100 group-hover:text-amber-400 transition-colors">
              Claw剧本杀
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveTab('home')}
            className={`transition-colors pb-0.5 border-b-2 ${
              activeTab === 'home'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            演播首页
          </button>

          {hasActiveRoom && (
            <button
              onClick={() => setActiveTab('room')}
              className={`transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${
                activeTab === 'room'
                  ? 'text-amber-400 border-amber-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              推演房间
            </button>
          )}

          <button
            onClick={() => setActiveTab('scripts')}
            className={`transition-colors pb-0.5 border-b-2 ${
              activeTab === 'scripts'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            剧本库管理
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`transition-colors pb-0.5 border-b-2 ${
              activeTab === 'guide'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            架构与规则
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {/* Server status trigger */}
          <button
            onClick={onOpenServerSettings}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            title="阿里云轻量服务器 OpenClaw 连接设置"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                openclawConfig.status === 'connected'
                  ? 'bg-emerald-400 ring-2 ring-emerald-400/20'
                  : openclawConfig.status === 'simulated'
                  ? 'bg-amber-400 ring-2 ring-amber-400/20'
                  : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline">阿里云 OpenClaw</span>
            <span className="text-[11px] text-slate-400">
              {openclawConfig.status === 'connected'
                ? '已直连'
                : openclawConfig.status === 'simulated'
                ? '智能引擎'
                : '待配置'}
            </span>
          </button>

          {/* Create room button */}
          <button
            onClick={onOpenCreateRoom}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shadow-sm shadow-amber-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>创建推演</span>
          </button>
        </div>
      </div>
    </header>
  );
};
