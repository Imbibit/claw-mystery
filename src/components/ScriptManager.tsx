import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Play,
  Edit3,
  Search,
  BookOpen,
  User,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Script, Character, Clue } from '../types/script';

interface ScriptManagerProps {
  scripts: Script[];
  onSaveScript: (script: Script) => void;
  onDeleteScript: (id: string) => void;
  onSelectScriptToPlay: (script: Script) => void;
}

export const ScriptManager: React.FC<ScriptManagerProps> = ({
  scripts,
  onSaveScript,
  onDeleteScript,
  onSelectScriptToPlay,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const filteredScripts = scripts.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDuplicate = (script: Script) => {
    const duplicated: Script = {
      ...script,
      id: `script-${Date.now()}`,
      title: `${script.title} (副本)`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    onSaveScript(duplicated);
  };

  const handleExportJSON = (script: Script) => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(script, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${script.title}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.title && Array.isArray(json.characters)) {
          const imported: Script = {
            ...json,
            id: `script-${Date.now()}`,
            createdAt: new Date().toISOString().split('T')[0],
          };
          onSaveScript(imported);
        } else {
          alert('导入失败：JSON 缺少剧本必须的 title 或 characters 字段。');
        }
      } catch (err) {
        alert('导入失败：无效的 JSON 文件格式。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const startCreateNew = () => {
    const newScript: Script = {
      id: `script-${Date.now()}`,
      title: '新建自定义剧本',
      summary: '请在此输入剧本简述……',
      background: '案发背景故事详细描述……',
      playerCount: 4,
      difficulty: '中等',
      tags: ['本格推理', '悬疑密室'],
      createdAt: new Date().toISOString().split('T')[0],
      characters: [
        {
          id: `char-dm-${Date.now()}`,
          name: 'DM 主持人',
          title: '古堡管家',
          avatar: '/src/assets/images/agent_dm_portrait_1791266324421.jpg',
          roleType: 'DM',
          isKiller: false,
          bio: '中立案情陈述者',
          secret: '无',
          alibi: '全程在客厅核验',
          personality: '庄重冷静',
        },
        {
          id: `char-det-${Date.now()}`,
          name: '侦探',
          title: '调查官',
          avatar: '/src/assets/images/agent_detective_portrait_1791266338741.jpg',
          roleType: 'DETECTIVE',
          isKiller: false,
          bio: '敏锐的理性侦探',
          secret: '无',
          alibi: '在书房勘察',
          personality: '犀利严谨',
        },
        {
          id: `char-sus1-${Date.now()}`,
          name: '嫌疑人甲',
          title: '贵宾',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
          roleType: 'SUSPECT',
          isKiller: true,
          bio: '隐藏真凶，制造时间诡计',
          secret: '使用了延时机关行凶',
          alibi: '声称在客房熟睡',
          personality: '善于辩解',
        },
      ],
      clues: [
        {
          id: `clue-${Date.now()}-1`,
          title: '核心现场物证',
          content: '门锁上有反常划痕。',
          type: 'SCENE',
          unlockCondition: '搜查案发大门',
        },
      ],
      truth: {
        killerId: '',
        killerName: '嫌疑人甲',
        motive: '利益纠纷与旧恨。',
        method: '利用延时机关在门反锁后制造密室。',
        timeline: ['23:00 - 案发前最后目击', '23:30 - 行凶并反锁密室'],
        easterEggs: ['线索中的划痕对应嫌疑人的钥匙扣'],
      },
    };
    setEditingScript(newScript);
    setIsCreatingNew(true);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-serif">
            剧本库管理
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            支持编辑剧本设定、人物秘密、线索池与真相复盘，可导出/导入 JSON 配置。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>导入剧本 JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            onClick={startCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>新建剧本</span>
          </button>
        </div>
      </div>

      {/* Search box */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索剧本名称或关键词..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Script List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredScripts.map((script) => (
          <div
            key={script.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{script.playerCount} 人本</span>
                <span aria-hidden="true">·</span>
                <span>{script.difficulty}</span>
                <span aria-hidden="true">·</span>
                <span>{script.clues.length} 个线索</span>
              </div>

              <h3 className="text-base font-bold text-slate-100 font-serif">
                {script.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {script.summary}
              </p>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-400 mb-1">登场角色：</div>
                <div className="flex flex-wrap gap-1">
                  {script.characters.map((c) => (
                    <span
                      key={c.id}
                      className="text-[11px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingScript(script);
                    setIsCreatingNew(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  title="编辑剧本"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicate(script)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  title="复制剧本"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExportJSON(script)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  title="导出为 JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {scripts.length > 1 && (
                  <button
                    onClick={() => onDeleteScript(script.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                    title="删除剧本"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onSelectScriptToPlay(script)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>开启推演</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Script Modal */}
      {editingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 font-serif">
                {isCreatingNew ? '新建剧本设定' : `编辑《${editingScript.title}》`}
              </h3>
              <button
                onClick={() => setEditingScript(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    剧本名称
                  </label>
                  <input
                    type="text"
                    value={editingScript.title}
                    onChange={(e) =>
                      setEditingScript({ ...editingScript, title: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    推理难度
                  </label>
                  <select
                    value={editingScript.difficulty}
                    onChange={(e: any) =>
                      setEditingScript({
                        ...editingScript,
                        difficulty: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="简单">简单</option>
                    <option value="中等">中等</option>
                    <option value="烧脑困难">烧脑困难</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  剧本简短摘要
                </label>
                <textarea
                  rows={2}
                  value={editingScript.summary}
                  onChange={(e) =>
                    setEditingScript({ ...editingScript, summary: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  案件背景故事（DM开场白内容）
                </label>
                <textarea
                  rows={4}
                  value={editingScript.background}
                  onChange={(e) =>
                    setEditingScript({ ...editingScript, background: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Character roster */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-200">
                    角色配置 ({editingScript.characters.length}位)
                  </h4>
                  <button
                    onClick={() => {
                      const newChar: Character = {
                        id: `char-${Date.now()}`,
                        name: '新嫌疑人',
                        title: '身份职业',
                        avatar:
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
                        roleType: 'SUSPECT',
                        isKiller: false,
                        bio: '生平简介',
                        secret: '隐藏的不可告人秘密',
                        alibi: '不在场证明',
                        personality: '个性描述',
                      };
                      setEditingScript({
                        ...editingScript,
                        characters: [...editingScript.characters, newChar],
                        playerCount: editingScript.characters.length + 1,
                      });
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    + 添加新角色
                  </button>
                </div>

                <div className="space-y-3">
                  {editingScript.characters.map((c, idx) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={c.name}
                          placeholder="角色名"
                          onChange={(e) => {
                            const updated = [...editingScript.characters];
                            updated[idx].name = e.target.value;
                            setEditingScript({
                              ...editingScript,
                              characters: updated,
                            });
                          }}
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                        <input
                          type="text"
                          value={c.title}
                          placeholder="身份头衔"
                          onChange={(e) => {
                            const updated = [...editingScript.characters];
                            updated[idx].title = e.target.value;
                            setEditingScript({
                              ...editingScript,
                              characters: updated,
                            });
                          }}
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                        <select
                          value={c.roleType}
                          onChange={(e: any) => {
                            const updated = [...editingScript.characters];
                            updated[idx].roleType = e.target.value;
                            setEditingScript({
                              ...editingScript,
                              characters: updated,
                            });
                          }}
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        >
                          <option value="SUSPECT">嫌疑人</option>
                          <option value="DETECTIVE">侦探</option>
                          <option value="DM">主持人 DM</option>
                        </select>
                      </div>

                      {c.roleType === 'SUSPECT' && (
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.isKiller}
                              onChange={(e) => {
                                const updated = editingScript.characters.map(
                                  (item, i) => ({
                                    ...item,
                                    isKiller: i === idx ? e.target.checked : false,
                                  })
                                );
                                setEditingScript({
                                  ...editingScript,
                                  characters: updated,
                                  truth: {
                                    ...editingScript.truth,
                                    killerName: e.target.checked
                                      ? c.name
                                      : editingScript.truth.killerName,
                                  },
                                });
                              }}
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                            />
                            <span className="font-medium text-rose-400">
                              标记为本案真凶 (仅复盘时解密)
                            </span>
                          </label>
                        </div>
                      )}

                      <textarea
                        rows={2}
                        value={c.bio}
                        placeholder="人物背景小传"
                        onChange={(e) => {
                          const updated = [...editingScript.characters];
                          updated[idx].bio = e.target.value;
                          setEditingScript({
                            ...editingScript,
                            characters: updated,
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Truth Section */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-rose-400">
                  案件真相与复盘设定 (复盘阶段公开)
                </h4>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    作案动机
                  </label>
                  <textarea
                    rows={2}
                    value={editingScript.truth.motive}
                    onChange={(e) =>
                      setEditingScript({
                        ...editingScript,
                        truth: {
                          ...editingScript.truth,
                          motive: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    作案手法与机关原理
                  </label>
                  <textarea
                    rows={2}
                    value={editingScript.truth.method}
                    onChange={(e) =>
                      setEditingScript({
                        ...editingScript,
                        truth: {
                          ...editingScript.truth,
                          method: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setEditingScript(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onSaveScript(editingScript);
                  setEditingScript(null);
                }}
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
              >
                保存剧本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
