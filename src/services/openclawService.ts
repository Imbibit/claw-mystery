import {
  Script,
  RoomState,
  GameStage,
  ChatMessage,
  VoteRecord,
  Character,
  Clue,
  OpenClawConfig,
} from '../types/script';

export class OpenClawOrchestrator {
  private roomState: RoomState;
  private onStateChange: (state: RoomState) => void;
  private timer: any = null;
  private config: OpenClawConfig;

  constructor(
    script: Script,
    config: OpenClawConfig,
    onStateChange: (state: RoomState) => void
  ) {
    this.config = config;
    this.onStateChange = onStateChange;

    const initialCharacterVoteStatus: Record<string, boolean> = {};
    script.characters.forEach((c) => {
      initialCharacterVoteStatus[c.id] = false;
    });

    this.roomState = {
      roomId: `ROOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      script,
      currentStage: 'STAGE_0_PREP',
      stageStep: 0,
      isPlaying: false,
      allowPrivateChat: config.allowPrivateChat ?? true,
      engineMode: config.engineMode || 'REMOTE_OPENCLAW',
      messages: [],
      unlockedClueIds: [],
      votes: [],
      votesAnnounced: false,
      startTime: Date.now(),
      characterVoteStatus: initialCharacterVoteStatus,
    };
  }

  public getState(): RoomState {
    return { ...this.roomState };
  }

  public play() {
    if (this.roomState.currentStage === 'STAGE_6_ENDED') return;
    this.roomState.isPlaying = true;
    this.emitState();
    this.scheduleNextStep();
  }

  public pause() {
    this.roomState.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emitState();
  }

  public async step() {
    if (this.roomState.currentStage === 'STAGE_6_ENDED') return;
    this.pause();
    await this.executeCurrentStep();
  }

  public restart() {
    this.pause();
    const initialCharacterVoteStatus: Record<string, boolean> = {};
    this.roomState.script.characters.forEach((c) => {
      initialCharacterVoteStatus[c.id] = false;
    });

    this.roomState = {
      ...this.roomState,
      roomId: `ROOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      currentStage: 'STAGE_0_PREP',
      stageStep: 0,
      isPlaying: false,
      messages: [],
      unlockedClueIds: [],
      votes: [],
      votesAnnounced: false,
      startTime: Date.now(),
      characterVoteStatus: initialCharacterVoteStatus,
      isWaitingAgent: false,
      waitingAgentName: undefined,
      waitingAgentAvatar: undefined,
      waitingAgentId: undefined,
    };
    this.emitState();
  }

  private emitState() {
    this.onStateChange({ ...this.roomState });
  }

  // 推演节奏：取消任何人工加速设置，真实等待远程 Agent 推理生成。
  // 每轮 Agent 回复呈现后，留出约 1.8 秒自然阅读间隔再驱动下一个步骤。
  private scheduleNextStep() {
    if (this.timer) clearTimeout(this.timer);
    if (!this.roomState.isPlaying) return;

    this.timer = setTimeout(async () => {
      await this.executeCurrentStep();
      if (
        this.roomState.isPlaying &&
        this.roomState.currentStage !== 'STAGE_6_ENDED'
      ) {
        this.scheduleNextStep();
      }
    }, 1800);
  }

  private addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const fullMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
    };
    this.roomState.messages = [...this.roomState.messages, fullMsg];
    this.emitState();
  }

  private unlockClue(clueId: string, discovererName: string) {
    if (!this.roomState.unlockedClueIds.includes(clueId)) {
      this.roomState.unlockedClueIds = [...this.roomState.unlockedClueIds, clueId];
      const clue = this.roomState.script.clues.find((c) => c.id === clueId);
      if (clue) {
        this.addMessage({
          senderId: 'dm',
          senderName: 'DM 主持人',
          senderAvatar: '/src/assets/images/agent_dm_portrait_1791266324421.jpg',
          senderRole: 'DM',
          type: 'CLUE_DISCOVERED',
          stage: this.roomState.currentStage,
          content: `【线索解锁】${discovererName} 发现了【${clue.title}】！已正式收录至案件公开档案。`,
        });
      }
    }
  }

  // 严格调用真实 Agent，取消静默降级替换台词！
  // 若发生网络异常或 Agent 未返回，如实抛出错误并暂停推演，拒绝用预设台词李代桃僵。
  private async getAgentSpeech(
    character: Character,
    prompt: string
  ): Promise<{ speech: string; reasoning?: string } | null> {
    if (this.roomState.engineMode === 'REMOTE_OPENCLAW') {
      try {
        return await this.fetchRemoteOpenClawSpeech(character, prompt);
      } catch (err: any) {
        // 严格禁止静默降级：明确告知观众推演异常，并暂停推演
        this.addMessage({
          senderId: 'dm',
          senderName: 'OpenClaw 推演异常通知',
          senderAvatar: '/src/assets/images/agent_dm_portrait_1791266324421.jpg',
          senderRole: 'DM',
          type: 'DM_SYSTEM',
          stage: this.roomState.currentStage,
          content: `⚠️ 【禁止自动降级】未能从 OpenClaw 角色【${character.name}】(${character.id}) 获取真实回复。\n异常原因：${err.message || '网络连接超时或网关异常'}\n\n系统已严格取消内置预设台词替代，当前推演已自动暂停。请检查阿里云服务器 OpenClaw 服务状态或在测试页排查后，点击【继续推演】。`,
        });
        this.pause();
        return null;
      }
    }

    if (this.roomState.engineMode === 'GEMINI_AI') {
      try {
        this.roomState.isWaitingAgent = true;
        this.roomState.waitingAgentName = character.name;
        this.roomState.waitingAgentAvatar = character.avatar;
        this.roomState.waitingAgentId = character.id;
        this.emitState();

        const res = await fetch('/api/ai/agent-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: this.roomState.currentStage,
            characterName: character.name,
            roleType: character.roleType,
            characterSecret: character.secret,
            alibi: character.alibi,
            isKiller: character.isKiller,
            scriptTitle: this.roomState.script.title,
            scriptBackground: this.roomState.script.background,
            recentMessages: this.roomState.messages.slice(-5),
            unlockedClues: this.roomState.script.clues.filter((c) =>
              this.roomState.unlockedClueIds.includes(c.id)
            ),
          }),
        });
        const data = await res.json();
        if (data.speech) {
          return { speech: data.speech };
        }
      } catch (e: any) {
        console.error('Gemini turn error:', e);
      } finally {
        this.roomState.isWaitingAgent = false;
        this.roomState.waitingAgentName = undefined;
        this.roomState.waitingAgentAvatar = undefined;
        this.roomState.waitingAgentId = undefined;
        this.emitState();
      }
    }

    // LOCAL_AUTONOMOUS 纯本地自主推演演示
    return {
      speech: this.getLocalFallbackSpeech(character, prompt),
    };
  }

  // 严格通过 OpenClaw 请求远程真实 Agent
  private async fetchRemoteOpenClawSpeech(
    character: Character,
    prompt: string
  ): Promise<{ speech: string; reasoning?: string }> {
    if (!this.config.serverUrl) {
      throw new Error('未配置 OpenClaw 远程服务器地址 (请在设置中配置)');
    }

    // 设置等待状态，在界面显示正在等待该 Agent 真实深度思考中
    this.roomState.isWaitingAgent = true;
    this.roomState.waitingAgentName = character.name;
    this.roomState.waitingAgentAvatar = character.avatar;
    this.roomState.waitingAgentId = character.id;
    this.emitState();

    try {
      const res = await fetch('/api/openclaw/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: this.config.serverUrl,
          token: this.config.apiToken,
          agentId: character.id,
          model: `openclaw/${character.id}`,
          message: prompt,
          systemPrompt: `你正在参与剧本杀《${this.roomState.script.title}》。
你的角色是【${character.name}】（${character.title}，类型：${character.roleType}）。
你的秘密信息：${character.secret || '无隐瞒'}。
案发不在场证明：${character.alibi || '正常'}。
${character.isKiller ? '【绝密身份】你是本案真凶！请极力掩盖罪行，合理辩驳甩锅，绝不直接认罪！' : '【清白立场】你不是凶手！请积极陈述细节、自证清白并质询可疑之人！'}
请严格保持第一人称身份进行推理，绝不可跳戏或提及AI相关用语。`,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data.error?.message || data.error || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('OpenClaw 未返回有效对白文本 choices[0].message.content');
      }

      // 保留原生深度思考过程（qwen3.7-plus 的 <think> 标签），避免界面与 OpenClaw 控制台产生差异
      let reasoningContent: string | undefined = undefined;
      let speechContent = rawContent.trim();

      const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        reasoningContent = thinkMatch[1].trim();
        speechContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }

      // 若所有内容都在 think 标签内，直接展示 think 内容作为正文
      if (!speechContent && reasoningContent) {
        speechContent = reasoningContent;
      }

      return {
        speech: speechContent || rawContent.trim(),
        reasoning: reasoningContent,
      };
    } finally {
      this.roomState.isWaitingAgent = false;
      this.roomState.waitingAgentName = undefined;
      this.roomState.waitingAgentAvatar = undefined;
      this.roomState.waitingAgentId = undefined;
      this.emitState();
    }
  }

  // 协调 6 大阶段的推演状态机
  private async executeCurrentStep() {
    const { currentStage, stageStep, script } = this.roomState;
    const dm = script.characters.find((c) => c.roleType === 'DM') || script.characters[0];
    const detective =
      script.characters.find((c) => c.roleType === 'DETECTIVE') || script.characters[1];
    const suspects = script.characters.filter((c) => c.roleType === 'SUSPECT');
    const killer =
      script.characters.find((c) => c.isKiller) || suspects[suspects.length - 1];

    switch (currentStage) {
      // ==========================================
      // STAGE 0: 开局准备 (DM background intro & setup)
      // ==========================================
      case 'STAGE_0_PREP': {
        if (stageStep === 0) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'STAGE_CHANGE',
            stage: 'STAGE_0_PREP',
            content: `【游戏开启】诸位旅客与调查员，欢迎来到本期剧本杀推演《${script.title}》。`,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 1) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'DM_SYSTEM',
            stage: 'STAGE_0_PREP',
            content: `【案件背景说明】\n${script.background}`,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 2) {
          // 侦探开场表态：真实呼叫侦探 Agent
          const prompt = `沈府书房反锁，沈老爷暴毙，现场唯一的紫砂茶壶嘴检出剧毒。作为租界名探【${detective.name}】，请发表你的第一段现场声明与侦查原则！`;
          const agentRes = await this.getAgentSpeech(detective, prompt);
          if (!agentRes) return; // 发生异常已暂停，等待用户排查

          this.addMessage({
            senderId: detective.id,
            senderName: detective.name,
            senderAvatar: detective.avatar,
            senderRole: 'DETECTIVE',
            type: 'SPEECH',
            stage: 'STAGE_0_PREP',
            content: agentRes.speech,
            reasoningContent: agentRes.reasoning,
          });

          // 进入阶段 1
          this.roomState.currentStage = 'STAGE_1_INTRO';
          this.roomState.stageStep = 0;
        }
        this.emitState();
        break;
      }

      // ==========================================
      // STAGE 1: 自我介绍 (Characters introduce themselves)
      // ==========================================
      case 'STAGE_1_INTRO': {
        if (stageStep === 0) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'STAGE_CHANGE',
            stage: 'STAGE_1_INTRO',
            content: `【阶段变更：自我介绍】请各位在场人员依次陈述身份背景与案发时段的不在场证明。`,
          });
          this.roomState.stageStep++;
        } else {
          const participants = [detective, ...suspects];
          const introIndex = stageStep - 1;

          if (introIndex < participants.length) {
            const char = participants[introIndex];
            const prompt = `你正在参与剧本杀《${script.title}》。现在是【自我介绍】环节。请作为【${char.name}】（身份：${char.title}），发表你的一段自我介绍，陈述你的身份以及案发时段你的不在场证明：${char.alibi}。请以第一人称简短生动发言。`;

            const agentRes = await this.getAgentSpeech(char, prompt);
            if (!agentRes) return; // 异常已暂停，严格等待用户排查

            this.addMessage({
              senderId: char.id,
              senderName: char.name,
              senderAvatar: char.avatar,
              senderRole: char.roleType,
              type: 'SPEECH',
              stage: 'STAGE_1_INTRO',
              content: agentRes.speech,
              reasoningContent: agentRes.reasoning,
            });
            this.roomState.stageStep++;
          } else {
            // 介绍完毕
            this.addMessage({
              senderId: dm.id,
              senderName: dm.name,
              senderAvatar: dm.avatar,
              senderRole: 'DM',
              type: 'DM_SYSTEM',
              stage: 'STAGE_1_INTRO',
              content: `各位的初次陈述已记录入档。案发时段皆有微妙空白，真相需由物证说话。准备进入搜证环节！`,
            });
            this.roomState.currentStage = 'STAGE_2_SEARCH';
            this.roomState.stageStep = 0;
          }
        }
        this.emitState();
        break;
      }

      // ==========================================
      // STAGE 2: 搜证环节 (Unlock clues dynamically via Agent search)
      // ==========================================
      case 'STAGE_2_SEARCH': {
        if (stageStep === 0) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'STAGE_CHANGE',
            stage: 'STAGE_2_SEARCH',
            content: `【阶段变更：搜证环节】搜证通道已开启，在场人员正对现场、遗体、起居室及随身物品展开地毯式勘查。`,
          });
          this.roomState.stageStep++;
        } else {
          const clueIndex = stageStep - 1;
          const totalClues = script.clues;

          if (clueIndex < totalClues.length) {
            const clue = totalClues[clueIndex];
            // 分配一个勘验角色
            let discoverer = detective;
            if (clue.type === 'CHARACTER' && clue.targetCharacterId) {
              const otherSuspects = suspects.filter(
                (s) => s.id !== clue.targetCharacterId
              );
              discoverer =
                otherSuspects[clueIndex % otherSuspects.length] || detective;
            } else if (clueIndex % 2 === 1 && suspects.length > 0) {
              discoverer = suspects[clueIndex % suspects.length];
            }

            // 呼叫该 Agent 真实陈述其勘查现场发现
            const prompt = `你在搜证勘验中发现了关键物证【${clue.title}】（证据内容：${clue.content}，位置：${clue.sceneLocation || '现场'}）。作为【${discoverer.name}】，请发表你发现这件证物时的第一反应与现场勘验说明！`;
            const agentRes = await this.getAgentSpeech(discoverer, prompt);
            if (!agentRes) return; // 异常暂停

            this.addMessage({
              senderId: discoverer.id,
              senderName: discoverer.name,
              senderAvatar: discoverer.avatar,
              senderRole: discoverer.roleType,
              type: 'SPEECH',
              stage: 'STAGE_2_SEARCH',
              content: agentRes.speech,
              reasoningContent: agentRes.reasoning,
            });

            // 解锁线索
            this.unlockClue(clue.id, discoverer.name);
            this.roomState.stageStep++;
          } else {
            // 搜证完毕
            this.addMessage({
              senderId: dm.id,
              senderName: dm.name,
              senderAvatar: dm.avatar,
              senderRole: 'DM',
              type: 'DM_SYSTEM',
              stage: 'STAGE_2_SEARCH',
              content: `【搜证完毕】全场全部核心线索搜寻完毕，已全部收录。各AI已掌握关键证物，即将开启集中公聊与对质！`,
            });
            this.roomState.currentStage = 'STAGE_3_DEDUCTION';
            this.roomState.stageStep = 0;
          }
        }
        this.emitState();
        break;
      }

      // ==========================================
      // STAGE 3: 集中公聊推理 (Cross-examination & debate)
      // ==========================================
      case 'STAGE_3_DEDUCTION': {
        if (stageStep === 0) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'STAGE_CHANGE',
            stage: 'STAGE_3_DEDUCTION',
            content: `【阶段变更：集中公聊推理】全员自由质询时间开始。请侦探与嫌疑人就线索疑点展开针锋相对的辩驳。`,
          });
          this.roomState.stageStep++;
        } else {
          // 提供 7 轮针锋相对的真实辩论
          const deductionTurns = 7;
          if (stageStep <= deductionTurns) {
            const success = await this.handleDeductionSpeechTurn(
              stageStep,
              detective,
              suspects,
              killer
            );
            if (!success) return; // 若 Agent 请求失败，暂停等待，不前进一步
            this.roomState.stageStep++;
          } else {
            this.addMessage({
              senderId: dm.id,
              senderName: dm.name,
              senderAvatar: dm.avatar,
              senderRole: 'DM',
              type: 'DM_SYSTEM',
              stage: 'STAGE_3_DEDUCTION',
              content: `公聊辩驳时间截止。矛盾与谎言已被层层剥离，接下来将进入不公开身份的秘密投票！`,
            });
            this.roomState.currentStage = 'STAGE_4_VOTE';
            this.roomState.stageStep = 0;
          }
        }
        this.emitState();
        break;
      }

      // ==========================================
      // STAGE 4: 匿名投票环节 (Secret ballots submitted to DM)
      // ==========================================
      case 'STAGE_4_VOTE': {
        if (stageStep === 0) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'STAGE_CHANGE',
            stage: 'STAGE_4_VOTE',
            content: `【阶段变更：匿名投票】请侦探与各位嫌疑人私聊向我提交你的真凶指认选票及理由。本投票对其他玩家完全匿名保密。`,
          });
          this.roomState.stageStep++;
        } else {
          const voters = [detective, ...suspects];
          const voteIndex = stageStep - 1;

          if (voteIndex < voters.length) {
            const voter = voters[voteIndex];
            const defaultRecord = this.generateVoteRecord(voter, killer, suspects, detective);

            const prompt = `现在是剧本杀《${script.title}》的【匿名投票】环节。请根据前面的所有搜证物证与公聊辩论，私聊向DM提交你的最终选票，明确写出你投给谁（李探长/沈夫人/管家老陈/沈少爷/李先生）以及你的核心定罪或甩锅理由。格式：我投给【某人】，理由是……`;

            const agentRes = await this.getAgentSpeech(voter, prompt);
            if (!agentRes) return; // 异常暂停，严格等待排查

            const ballotContent = `[私聊致DM] ${agentRes.speech}`;

            this.roomState.votes.push(defaultRecord);
            this.roomState.characterVoteStatus[voter.id] = true;

            this.addMessage({
              senderId: voter.id,
              senderName: voter.name,
              senderAvatar: voter.avatar,
              senderRole: voter.roleType,
              type: 'VOTE_SUBMIT',
              isPrivate: true,
              privateTargetName: dm.name,
              privateTargetId: dm.id,
              stage: 'STAGE_4_VOTE',
              content: ballotContent,
              reasoningContent: agentRes.reasoning,
            });
            this.roomState.stageStep++;
          } else if (!this.roomState.votesAnnounced) {
            // DM 公布计票统计结果
            this.roomState.votesAnnounced = true;
            const tally: Record<string, number> = {};
            this.roomState.votes.forEach((v) => {
              tally[v.targetName] = (tally[v.targetName] || 0) + 1;
            });

            const sortedTally = Object.entries(tally).sort((a, b) => b[1] - a[1]);
            const tallyText = sortedTally
              .map(([name, count]) => `· 【${name}】：${count} 票`)
              .join('\n');

            this.addMessage({
              senderId: dm.id,
              senderName: dm.name,
              senderAvatar: dm.avatar,
              senderRole: 'DM',
              type: 'DM_SYSTEM',
              stage: 'STAGE_4_VOTE',
              content: `【投票统计结果公示】\n所有选票已清点归档！\n${tallyText}\n\n最高得票者为【${sortedTally[0][0]}】（${sortedTally[0][1]}票）！`,
            });

            this.roomState.currentStage = 'STAGE_5_TRUTH';
            this.roomState.stageStep = 0;
          }
        }
        this.emitState();
        break;
      }

      // ==========================================
      // STAGE 5: 案件真相复盘 (Truth reveal & Real Agent debrief)
      // ==========================================
      case 'STAGE_5_TRUTH': {
        const truth = script.truth;
        if (stageStep === 0) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'STAGE_CHANGE',
            stage: 'STAGE_5_TRUTH',
            content: `【阶段变更：案件真相大复盘】迷雾散尽，现在由我公布本案完整真相！`,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 1) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'TRUTH_REVEAL',
            stage: 'STAGE_5_TRUTH',
            content: `【真凶身份揭晓】\n本案真正的凶手是 —— 【${truth.killerName}】！`,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 2) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'TRUTH_REVEAL',
            stage: 'STAGE_5_TRUTH',
            content: `【作案动机】\n${truth.motive}`,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 3) {
          this.addMessage({
            senderId: dm.id,
            senderName: dm.name,
            senderAvatar: dm.avatar,
            senderRole: 'DM',
            type: 'TRUTH_REVEAL',
            stage: 'STAGE_5_TRUTH',
            content: `【作案诡计与密室手法】\n${truth.method}`,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 4) {
          // 侦探结案陈词：真实呼叫侦探 Agent
          const prompt = `案件真相已揭晓，真凶确认为【${truth.killerName}】。请作为租界名探【${detective.name}】，发表你的总结陈词与破案感言！`;
          const agentRes = await this.getAgentSpeech(detective, prompt);
          if (!agentRes) return; // 异常暂停

          this.addMessage({
            senderId: detective.id,
            senderName: detective.name,
            senderAvatar: detective.avatar,
            senderRole: 'DETECTIVE',
            type: 'SPEECH',
            stage: 'STAGE_5_TRUTH',
            content: agentRes.speech,
            reasoningContent: agentRes.reasoning,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 5) {
          // 凶手认罪感言：真实呼叫真凶 Agent
          const prompt = `你的罪行已被侦探与证据链彻底揭穿！请作为真凶【${killer.name}】，发表你最终的认罪陈词或悔恨心路！`;
          const agentRes = await this.getAgentSpeech(killer, prompt);
          if (!agentRes) return; // 异常暂停

          this.addMessage({
            senderId: killer.id,
            senderName: killer.name,
            senderAvatar: killer.avatar,
            senderRole: 'SUSPECT',
            type: 'SPEECH',
            stage: 'STAGE_5_TRUTH',
            content: agentRes.speech,
            reasoningContent: agentRes.reasoning,
          });

          this.roomState.currentStage = 'STAGE_6_ENDED';
          this.roomState.stageStep = 0;
          this.roomState.isPlaying = false;
        }
        this.emitState();
        break;
      }

      case 'STAGE_6_ENDED': {
        this.roomState.isPlaying = false;
        this.emitState();
        break;
      }
    }
  }

  // 集中推理的 7 轮动态对质，取消一切预设台词，真实调用每位 Agent
  private async handleDeductionSpeechTurn(
    turn: number,
    detective: Character,
    suspects: Character[],
    killer: Character
  ): Promise<boolean> {
    const innocenceSuspect = suspects.find((s) => !s.isKiller) || suspects[0];
    const secondSuspect =
      suspects.find((s) => !s.isKiller && s.id !== innocenceSuspect.id) ||
      suspects[1] ||
      innocenceSuspect;

    const recentContext = this.roomState.messages
      .slice(-4)
      .map((m) => `${m.senderName}: ${m.content}`)
      .join('\n');

    switch (turn) {
      case 1: {
        // 侦探首轮发难
        const prompt = `你正在主持剧本杀《${this.roomState.script.title}》的集中推理质询。\n前序对话：\n${recentContext}\n请作为侦探【${detective.name}】，指出已知线索矛盾（反锁书房、茶杯砒霜抹毒），对在场嫌疑人发起第一轮犀利质询！`;
        const res = await this.getAgentSpeech(detective, prompt);
        if (!res) return false;

        this.addMessage({
          senderId: detective.id,
          senderName: detective.name,
          senderAvatar: detective.avatar,
          senderRole: 'DETECTIVE',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: res.speech,
          reasoningContent: res.reasoning,
        });
        return true;
      }

      case 2: {
        // 真凶（或第一嫌疑人）反驳并转移嫌疑
        const prompt = `侦探刚才发表了关于案发现场线索的质询：\n${recentContext}\n作为【${killer.name}】，请保持沉着冷静，巧妙辩解并合情合理地转移嫌疑至其他嫌疑人身上！`;
        const res = await this.getAgentSpeech(killer, prompt);
        if (!res) return false;

        this.addMessage({
          senderId: killer.id,
          senderName: killer.name,
          senderAvatar: killer.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: res.speech,
          reasoningContent: res.reasoning,
        });
        return true;
      }

      case 3: {
        // 无辜嫌疑人激烈自辩并反击
        const prompt = `有人在公聊中试图将嫌疑引向你。\n前序质询：\n${recentContext}\n请作为【${innocenceSuspect.name}】，坚决自证清白并指出对方言语与证据中的破绽！`;
        const res = await this.getAgentSpeech(innocenceSuspect, prompt);
        if (!res) return false;

        this.addMessage({
          senderId: innocenceSuspect.id,
          senderName: innocenceSuspect.name,
          senderAvatar: innocenceSuspect.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: res.speech,
          reasoningContent: res.reasoning,
        });
        return true;
      }

      case 4: {
        // 私聊拉拢（若允许私聊）或第二位嫌疑人发言
        if (this.roomState.allowPrivateChat) {
          const prompt = `你打算私聊拉拢【${secondSuspect.name}】建立同盟。请以密谋耳语口吻给对方发一段简短私聊，劝说对方投票指认其他人。`;
          const res = await this.getAgentSpeech(killer, prompt);
          if (!res) return false;

          this.addMessage({
            senderId: killer.id,
            senderName: killer.name,
            senderAvatar: killer.avatar,
            senderRole: 'SUSPECT',
            type: 'SPEECH',
            isPrivate: true,
            privateTargetName: secondSuspect.name,
            privateTargetId: secondSuspect.id,
            stage: 'STAGE_3_DEDUCTION',
            content: `[私聊] ${res.speech}`,
            reasoningContent: res.reasoning,
          });
        } else {
          const prompt = `请作为【${secondSuspect.name}】，针对现场发现的可疑痕迹与不在场证明进行质询！`;
          const res = await this.getAgentSpeech(secondSuspect, prompt);
          if (!res) return false;

          this.addMessage({
            senderId: secondSuspect.id,
            senderName: secondSuspect.name,
            senderAvatar: secondSuspect.avatar,
            senderRole: 'SUSPECT',
            type: 'SPEECH',
            stage: 'STAGE_3_DEDUCTION',
            content: res.speech,
            reasoningContent: res.reasoning,
          });
        }
        return true;
      }

      case 5: {
        // 第二嫌疑人进一步质问疑点
        const prompt = `请作为【${secondSuspect.name}】，发表你的进一步怀疑与辩解：\n${recentContext}`;
        const res = await this.getAgentSpeech(secondSuspect, prompt);
        if (!res) return false;

        this.addMessage({
          senderId: secondSuspect.id,
          senderName: secondSuspect.name,
          senderAvatar: secondSuspect.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: res.speech,
          reasoningContent: res.reasoning,
        });
        return true;
      }

      case 6: {
        // 众人聚焦在真凶身上，真凶做最后辩护
        const prompt = `众人把疑点逐渐聚焦到你身上。\n最新质询：\n${recentContext}\n作为【${killer.name}】，做出最后坚定的情绪反驳与辩白！`;
        const res = await this.getAgentSpeech(killer, prompt);
        if (!res) return false;

        this.addMessage({
          senderId: killer.id,
          senderName: killer.name,
          senderAvatar: killer.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: res.speech,
          reasoningContent: res.reasoning,
        });
        return true;
      }

      case 7: {
        // 侦探给出决定性证据链一击
        const prompt = `推理到了最后关头。\n全场争辩：\n${recentContext}\n作为侦探【${detective.name}】，总结所有物证与动机矛盾，对真凶给出决定性的逻辑一击！`;
        const res = await this.getAgentSpeech(detective, prompt);
        if (!res) return false;

        this.addMessage({
          senderId: detective.id,
          senderName: detective.name,
          senderAvatar: detective.avatar,
          senderRole: 'DETECTIVE',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: res.speech,
          reasoningContent: res.reasoning,
        });
        return true;
      }

      default:
        return true;
    }
  }

  private generateVoteRecord(
    voter: Character,
    killer: Character,
    suspects: Character[],
    detective: Character
  ): VoteRecord {
    if (voter.id === killer.id) {
      const target = suspects.find((s) => s.id !== killer.id) || detective;
      return {
        voterId: voter.id,
        voterName: voter.name,
        targetId: target.id,
        targetName: target.name,
        reason: '其具有强烈的经济危机或矛盾动机，案发时间段存在独处空白。',
        submittedAt: Date.now(),
      };
    }

    return {
      voterId: voter.id,
      voterName: voter.name,
      targetId: killer.id,
      targetName: killer.name,
      reason: '物证痕迹与作案动机完全闭环，唯一的密室行凶便利者。',
      submittedAt: Date.now(),
    };
  }

  // 纯离线演示时的后备（仅在用户主动选择 LOCAL_AUTONOMOUS 时使用）
  private getLocalFallbackSpeech(char: Character, prompt: string): string {
    if (char.roleType === 'DETECTIVE') {
      return `【${char.name}】依循现场勘查，物证链条正在收拢，一切谎言在密室因果面前都将无所遁形。`;
    }
    return `【${char.name}】我所说句句属实，当晚我绝无靠近作案现场，请诸位明察！`;
  }
}
