import React from 'react';
import { Server, Cpu, Shield, Users, Layers, MessageSquare, CheckCircle2 } from 'lucide-react';

export const GuideView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-serif">
          系统架构与推演规则说明
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          深入理解基于 OpenClaw 的多智能体驱动剧本杀观摩运行机制
        </p>
      </div>

      {/* 1. OpenClaw Architecture */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
          <Server className="w-4 h-4" />
          <span>阿里云轻量应用服务器 + OpenClaw 多Agent框架</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          OpenClaw 负责管理全部智能体（DM Agent、侦探 Agent、嫌疑人 Agents）的生命周期、角色记忆隔离与消息路由。
          在阿里云轻量应用服务器上，每个智能体均拥有独立的 System Prompt 与私有记忆上下文，互相之间无法越权窥视彼此的真实剧本秘密，真凶亦无法得知侦探下一步搜证方向。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-200 block">独立记忆隔离</span>
            <p className="text-[11px] text-slate-400">
              各角色仅持有个人小传、案发时间线与个人秘密，杜绝全知视角作弊。
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-200 block">DM仲裁机制</span>
            <p className="text-[11px] text-slate-400">
              线索解锁请求与匿名投票均由 DM Agent 统一裁定、统计并公开广播。
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-200 block">WebSocket推送</span>
            <p className="text-[11px] text-slate-400">
              推演进程与对话流实时推送至前端网页，延迟低、观摩流畅。
            </p>
          </div>
        </div>
      </section>

      {/* 2. 6-Stage Process */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-100 font-serif">
          完整 6 阶段游戏流程驱动
        </h2>
        <div className="space-y-3">
          {[
            {
              step: '阶段 0',
              title: '开局准备',
              desc: 'DM主持人开场播报剧本背景故事、案发密室环境与初始秩序说明，侦探确立调查目标。',
            },
            {
              step: '阶段 1',
              title: '自我介绍',
              desc: 'DM依次点名在场角色，侦探与各位嫌疑人依次自报身份职业、与死者的公开关系及案发时段的不在场证明。',
            },
            {
              step: '阶段 2',
              title: '搜证环节',
              desc: 'AI角色主动发起搜证勘验请求；DM审核并解锁对应现场物证、私人遗留物或死者尸检记录，动态推送到线索档案面板。',
            },
            {
              step: '阶段 3',
              title: '集中推理与激辩',
              desc: '侦探指出证词中的矛盾与手法疑点，各嫌疑人自证清白并相互质询；真凶AI进行狡辩与甩锅，若开启私聊可进行暗中密谋。',
            },
            {
              step: '阶段 4',
              title: '匿名投票',
              desc: 'DM开启秘密指写真凶投票通道，所有AI角色私聊向DM提交选票与推理依据；DM清点选票并在公聊窗口宣布得票最高者。',
            },
            {
              step: '阶段 5 / 结束',
              title: '案件真相复盘',
              desc: 'DM揭开全案谜底：真凶身份、作案动机、密室机关构造及全部隐藏伏笔，推演结束并支持导出整场笔录。',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 flex items-start gap-3 text-xs"
            >
              <span className="font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 shrink-0">
                {item.step}
              </span>
              <div>
                <span className="font-semibold text-slate-200 block mb-0.5">
                  {item.title}
                </span>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Spectator Policy */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-3 text-xs leading-relaxed text-slate-300">
        <h3 className="font-bold text-slate-100 font-serif">
          观众权限与可见性规则
        </h3>
        <p>
          1. <strong>零输入模式</strong>：用户为纯粹旁观者，界面不设输入框，无法代替任何角色发言、搜证或投票。
        </p>
        <p>
          2. <strong>透明博弈</strong>：所有公聊发言、已解锁的公开/角色线索，以及角色间的私聊耳语，观众皆可实时观摩。
        </p>
        <p>
          3. <strong>悬念保障</strong>：在阶段 5 DM 真相复盘之前，前端界面绝不透露谁是真凶，为观众保留原汁原味的推理猜测乐趣。
        </p>
      </section>
    </div>
  );
};
