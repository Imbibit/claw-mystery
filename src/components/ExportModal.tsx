import React, { useState } from 'react';
import { Download, Copy, Check, FileText } from 'lucide-react';
import { RoomState, STAGE_NAMES } from '../types/script';

interface ExportModalProps {
  roomState: RoomState;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  roomState,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const generateMarkdown = () => {
    const s = roomState.script;
    let md = `# 《${s.title}》AI多Agent剧本杀推演笔录\n\n`;
    md += `- **推演房间**：${roomState.roomId}\n`;
    md += `- **推演模式**：OpenClaw 多Agent观摩系统\n`;
    md += `- **案件难度**：${s.difficulty}（${s.playerCount}人本）\n`;
    md += `- **推演时间**：${new Date(roomState.startTime).toLocaleString('zh-CN')}\n\n`;

    md += `## 一、案件背景\n${s.background}\n\n`;

    md += `## 二、登场AI角色\n`;
    s.characters.forEach((c) => {
      md += `- **${c.name}**（${c.title} · ${c.roleType}）：${c.bio}\n`;
    });
    md += `\n`;

    md += `## 三、已勘验物证线索 (${roomState.unlockedClueIds.length}/${s.clues.length})\n`;
    s.clues
      .filter((c) => roomState.unlockedClueIds.includes(c.id))
      .forEach((c) => {
        md += `### 【${c.title}】(${c.type})\n${c.content}\n\n`;
      });

    md += `## 四、推演全真对话实录\n`;
    roomState.messages.forEach((m) => {
      const timeStr = new Date(m.timestamp).toLocaleTimeString('zh-CN');
      if (m.type === 'STAGE_CHANGE') {
        md += `\n### >>> ${m.content} <<<\n\n`;
      } else {
        md += `**[${timeStr}] ${m.senderName}**${m.isPrivate ? ` (私聊->${m.privateTargetName})` : ''}：\n> ${m.content}\n\n`;
      }
    });

    if (roomState.votes.length > 0) {
      md += `## 五、秘密选票记录\n`;
      roomState.votes.forEach((v) => {
        md += `- **${v.voterName}** 投给 **${v.targetName}**：${v.reason}\n`;
      });
      md += `\n`;
    }

    if (
      roomState.currentStage === 'STAGE_5_TRUTH' ||
      roomState.currentStage === 'STAGE_6_ENDED'
    ) {
      md += `## 六、案件真相大复盘\n`;
      md += `- **真凶身份**：${s.truth.killerName}\n`;
      md += `- **作案动机**：${s.truth.motive}\n`;
      md += `- **作案手法**：${s.truth.method}\n`;
    }

    return md;
  };

  const handleDownloadMD = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `剧本杀推演记录_${roomState.script.title}_${roomState.roomId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(roomState, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `剧本杀推演记录_${roomState.script.title}_${roomState.roomId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100 font-serif">
              导出本局推演笔录
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-300">
            笔录已完整归纳本场推演背景、AI角色自白、物证勘验记录、秘密选票及案件复盘复盘真相。
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-slate-400">
            <div>剧本：《{roomState.script.title}》</div>
            <div>房间编号：{roomState.roomId}</div>
            <div>累计发言记录：{roomState.messages.length} 条</div>
            <div>已解锁物证：{roomState.unlockedClueIds.length} 项</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>已复制到剪贴板</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制 Markdown 全文</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 JSON 数据</span>
            </button>

            <button
              onClick={handleDownloadMD}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 fill-current" />
              <span>下载 Markdown 报告</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
