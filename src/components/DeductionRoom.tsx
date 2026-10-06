import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Download,
  Search,
  MessageSquare,
  Shield,
  HelpCircle,
  FileText,
  User,
  Eye,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import {
  RoomState,
  GameStage,
  STAGE_NAMES,
  Character,
  Clue,
  ChatMessage,
} from '../types/script';
import { OpenClawOrchestrator } from '../services/openclawService';

interface DeductionRoomProps {
  orchestrator: OpenClawOrchestrator;
  roomState: RoomState;
  onExit: () => void;
  onOpenExportModal: () => void;
}

export const DeductionRoom: React.FC<DeductionRoomProps> = ({
  orchestrator,
  roomState,
  onExit,
  onOpenExportModal,
}) => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [activeClueFilter, setActiveClueFilter] = useState<'ALL' | 'PUBLIC' | 'CHARACTER' | 'SCENE'>('ALL');
  const [isCluePanelOpen, setIsCluePanelOpen] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedReasonings, setExpandedReasonings] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat stream
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomState.messages, autoScroll]);

  // Handle user scroll to enable/disable autoscroll
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    setAutoScroll(isAtBottom);
  };

  const stages: GameStage[] = [
    'STAGE_0_PREP',
    'STAGE_1_INTRO',
    'STAGE_2_SEARCH',
    'STAGE_3_DEDUCTION',
    'STAGE_4_VOTE',
    'STAGE_5_TRUTH',
  ];

  const currentStageIndex = stages.indexOf(roomState.currentStage);
  const isEnded = roomState.currentStage === 'STAGE_6_ENDED';
  const isTruthRevealed = roomState.currentStage === 'STAGE_5_TRUTH' || isEnded;

  // Clues logic
  const allClues = roomState.script.clues;
  const unlockedClues = allClues.filter((c) =>
    roomState.unlockedClueIds.includes(c.id)
  );

  const filteredUnlockedClues = unlockedClues.filter((c) => {
    if (activeClueFilter === 'ALL') return true;
    return c.type === activeClueFilter;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1600px] mx-auto overflow-hidden">
      {/* 3.1 状态面板（顶部常驻） */}
      <section className="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Room info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="返回演播列表"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 font-serif">
                  {roomState.script.title}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-amber-400/90">
                  {roomState.roomId}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>消息 {roomState.messages.length} 条</span>
                <span>·</span>
                <span>线索 {unlockedClues.length}/{allClues.length}</span>
                <span>·</span>
                <span className="text-amber-400/90 font-medium">观众全景视角 (只读)</span>
              </div>
            </div>
          </div>

          {/* 6-Stage Timeline Steps */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none">
            {stages.map((stageKey, idx) => {
              const isPast = currentStageIndex > idx || isEnded;
              const isCurrent =
                roomState.currentStage === stageKey && !isEnded;
              const shortName = STAGE_NAMES[stageKey].replace(/^阶段\d: /, '');

              return (
                <div
                  key={stageKey}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 font-semibold'
                      : isPast
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCurrent
                        ? 'bg-amber-400 animate-pulse'
                        : isPast
                        ? 'bg-emerald-400'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>{shortName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Arena (Left: Characters, Center: Chat Stream, Right: Clues) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3.2 角色列表侧边栏 (Left Sidebar) */}
        <aside className="w-64 lg:w-72 bg-slate-950/70 border-r border-slate-800/90 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300">
              登场角色 ({roomState.script.characters.length})
            </h3>
            <span className="text-[11px] text-slate-500">全部为 AI Agent</span>
          </div>

          <div className="space-y-2.5">
            {roomState.script.characters.map((char) => {
              const isDM = char.roleType === 'DM';
              const isDetective = char.roleType === 'DETECTIVE';
              const hasVoted = roomState.characterVoteStatus[char.id];
              const isVotingStage = roomState.currentStage === 'STAGE_4_VOTE';

              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedCharacter?.id === char.id
                      ? 'bg-slate-800/90 border-amber-400/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={char.avatar}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                          isDM
                            ? 'bg-amber-400'
                            : isDetective
                            ? 'bg-sky-400'
                            : 'bg-indigo-400'
                        }`}
                        title={char.roleType}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {char.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isDM ? '主持人' : isDetective ? '侦探' : '嫌疑人'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {char.title}
                      </div>

                      {/* Vote state in voting phase */}
                      {isVotingStage && !isDM && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                          {hasVoted ? (
                            <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> 已提交密选
                            </span>
                          ) : (
                            <span className="text-amber-400/80 animate-pulse">
                              正在权衡证词...
                            </span>
                          )}
                        </div>
                      )}

                      {/* Truth Reveal: strictly reveal killer only in Stage 5 or Ended */}
                      {isTruthRevealed && char.isKiller && (
                        <div className="mt-1 text-[11px] font-bold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>【真凶揭晓】</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
            💡 规则说明：复盘揭晓前，真凶身份严格保密；所有角色均在OpenClaw隔离环境下自主发言。
          </div>
        </aside>

        {/* 3.4 聊天窗口 (Center Stream) */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {/* Scroll to bottom floating badge if user scrolled up */}
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 text-xs bg-amber-400 text-slate-950 font-medium rounded-full shadow-lg hover:bg-amber-300 transition-colors"
            >
              有新推演发言 · 点击回到底部
            </button>
          )}

          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
          >
            {roomState.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <Play className="w-6 h-6 ml-0.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">
                  推演房间已就绪
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  点击下方【继续推演】或【单步推演】，DM主持人将开启案件开场与角色介绍。
                </p>
                <button
                  onClick={() => orchestrator.play()}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors mt-2"
                >
                  立即启动推演
                </button>
              </div>
            ) : (
              roomState.messages.map((msg) => {
                // 1. Stage change system banner
                if (msg.type === 'STAGE_CHANGE') {
                  return (
                    <div
                      key={msg.id}
                      className="my-4 py-2 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center"
                    >
                      <div className="text-xs font-bold text-amber-400 tracking-wider">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // 2. DM System or Clue Discovered or Error Alert
                if (msg.type === 'DM_SYSTEM' || msg.type === 'CLUE_DISCOVERED') {
                  const isWarning = msg.content.includes('⚠️ 【禁止自动降级】') || msg.content.includes('异常');

                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl border leading-relaxed text-xs shadow-sm ${
                        isWarning
                          ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 ring-1 ring-rose-500/20'
                          : msg.type === 'CLUE_DISCOVERED'
                          ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 font-bold">
                        <div className={`flex items-center gap-2 ${isWarning ? 'text-rose-400' : 'text-amber-400'}`}>
                          {isWarning ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Shield className="w-3.5 h-3.5" />}
                          <span>{msg.senderName}</span>
                        </div>
                        {isWarning && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300">
                            已暂停推演 · 严禁降级
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-line text-xs">{msg.content}</div>
                    </div>
                  );
                }

                // 3. Truth Reveal Announcement
                if (msg.type === 'TRUTH_REVEAL') {
                  return (
                    <div
                      key={msg.id}
                      className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-rose-200 text-xs leading-relaxed space-y-1.5 shadow-lg"
                    >
                      <div className="font-bold text-rose-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-rose-400" />
                        <span>{msg.senderName}（真相复盘）</span>
                      </div>
                      <div className="whitespace-pre-line text-slate-200">{msg.content}</div>
                    </div>
                  );
                }

                // 4. Regular Character Speech / Secret Ballot
                const isDetective = msg.senderRole === 'DETECTIVE';
                const isPrivate = msg.isPrivate;
                const isExpanded = !!expandedReasonings[msg.id];

                return (
                  <div key={msg.id} className="flex gap-3 items-start">
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0 mt-0.5"
                    />

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-200">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {isDetective
                            ? '侦探顾问'
                            : msg.senderRole === 'DM'
                            ? '主持人'
                            : '嫌疑人'}
                        </span>

                        {isPrivate && (
                          <span className="text-[10px] font-medium text-amber-300/90 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60">
                            密语观众可见 · 发送给 {msg.privateTargetName}
                          </span>
                        )}
                      </div>

                      <div
                        className={`p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-2xl border ${
                          isPrivate
                            ? 'bg-amber-950/20 border-amber-500/30 text-amber-100'
                            : isDetective
                            ? 'bg-slate-900 border-sky-900/40 text-slate-200'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>

                        {/* Collapsible think reasoning trace if returned by model */}
                        {msg.reasoningContent && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReasonings((prev) => ({
                                  ...prev,
                                  [msg.id]: !prev[msg.id],
                                }))
                              }
                              className="flex items-center gap-1.5 text-[11px] text-amber-400/90 hover:text-amber-300 font-medium transition-colors"
                            >
                              <Brain className="w-3.5 h-3.5 text-amber-400" />
                              <span>
                                {isExpanded ? '收起' : '查看'} OpenClaw 原生思考推理链 (Think Trace)
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                                <div className="text-[10px] text-amber-400/70 mb-1 font-sans">
                                  💡 角色模型深度思考与决策心路：
                                </div>
                                {msg.reasoningContent}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {/* Live Agent thinking indicator */}
            {roomState.isWaitingAgent && (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-sky-500/40 bg-sky-950/20 text-sky-200 text-xs shadow-md">
                <div className="flex items-center gap-3">
                  {roomState.waitingAgentAvatar ? (
                    <img
                      src={roomState.waitingAgentAvatar}
                      alt={roomState.waitingAgentName}
                      className="w-8 h-8 rounded-full object-cover border border-sky-400"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 font-bold">
                      AI
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="font-semibold text-sky-300">
                      【{roomState.waitingAgentName || 'Agent'}】
                    </span>
                    <span>正在通过 OpenClaw (qwen3.7-plus) 深度思考推理中，请静候回复...</span>
                    <span className="inline-flex gap-1 items-center ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => orchestrator.pause()}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
                >
                  暂停等待
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 3.5 推演控制区（无任何用户输入框，纯观摩控制） */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Play / Pause / Step Controls */}
              <div className="flex items-center gap-2">
                {roomState.isPlaying ? (
                  <button
                    onClick={() => orchestrator.pause()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>暂停推演</span>
                  </button>
                ) : (
                  <button
                    onClick={() => orchestrator.play()}
                    disabled={isEnded}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>继续推演</span>
                  </button>
                )}

                <button
                  onClick={() => orchestrator.step()}
                  disabled={isEnded}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg transition-colors"
                  title="每次点击生成一轮AI发言，逐句观察推理"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>单步推演</span>
                </button>

                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>节奏：静候 Agent 真实回复</span>
                </div>
              </div>

              {/* Utility actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCluePanelOpen(!isCluePanelOpen)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>线索库 ({unlockedClues.length})</span>
                </button>

                <button
                  onClick={() => orchestrator.restart()}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="重新推演本局"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenExportModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  title="导出推演记录"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">导出记录</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* 3.3 线索面板 (Right Panel) */}
        {isCluePanelOpen && (
          <aside className="w-72 lg:w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-serif">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>已解锁物证档案</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  已收录 {unlockedClues.length} / 共 {allClues.length} 个线索
                </span>
              </div>
              <button
                onClick={() => setIsCluePanelOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Filter segmented buttons */}
            <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-1 text-[11px]">
              {(['ALL', 'SCENE', 'CHARACTER', 'PUBLIC'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setActiveClueFilter(filterKey)}
                  className={`px-2 py-1 rounded transition-colors ${
                    activeClueFilter === filterKey
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filterKey === 'ALL'
                    ? '全部'
                    : filterKey === 'SCENE'
                    ? '场景'
                    : filterKey === 'CHARACTER'
                    ? '角色'
                    : '公共'}
                </button>
              ))}
            </div>

            {/* Clues scroll list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredUnlockedClues.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <Lock className="w-6 h-6 mx-auto opacity-50" />
                  <p>当前分类暂无解锁线索</p>
                  <p className="text-[11px] text-slate-600">
                    AI角色进入【搜证环节】后将逐步勘验并解锁物证。
                  </p>
                </div>
              ) : (
                filteredUnlockedClues.map((clue) => (
                  <div
                    key={clue.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        {clue.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {clue.type === 'SCENE'
                          ? '现场物证'
                          : clue.type === 'CHARACTER'
                          ? '私人证物'
                          : '公共线索'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {clue.content}
                    </p>

                    <div className="pt-1 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>{clue.sceneLocation || '现场勘验'}</span>
                      <span className="text-emerald-400/90">已公开收录</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Character Dossier Inspection Modal */}
      {selectedCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCharacter.avatar}
                  alt={selectedCharacter.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover border border-amber-400/40"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-serif">
                    {selectedCharacter.name}
                  </h3>
                  <div className="text-xs text-amber-400 font-medium">
                    {selectedCharacter.title} · {selectedCharacter.roleType}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCharacter(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <span className="text-slate-400 block mb-0.5 font-medium">人物履历与公开身份：</span>
                <p className="text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {selectedCharacter.bio}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5 font-medium">案发陈述与行踪证明：</span>
                <p className="text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {selectedCharacter.alibi}
                </p>
              </div>

              {/* Secret strictly only visible after Truth Reveal or if DM */}
              {isTruthRevealed && (
                <div>
                  <span className="text-rose-400 block mb-0.5 font-medium">
                    案件真相与隐秘剧情（已解密）：
                  </span>
                  <p className="text-rose-200 bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/30">
                    {selectedCharacter.secret}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCharacter(null)}
                className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                关闭案卷
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
