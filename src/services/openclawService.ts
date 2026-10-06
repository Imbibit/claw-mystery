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
      speed: config.speed || 'normal',
      allowPrivateChat: config.allowPrivateChat ?? true,
      engineMode: config.engineMode || 'LOCAL_AUTONOMOUS',
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

  public setSpeed(speed: 'slow' | 'normal' | 'fast') {
    this.roomState.speed = speed;
    this.emitState();
    if (this.roomState.isPlaying) {
      this.pause();
      this.play();
    }
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

  public step() {
    if (this.roomState.currentStage === 'STAGE_6_ENDED') return;
    this.pause();
    this.executeCurrentStep();
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
    };
    this.emitState();
  }

  private emitState() {
    this.onStateChange({ ...this.roomState });
  }

  private getDelay(): number {
    switch (this.roomState.speed) {
      case 'slow':
        return 3200;
      case 'fast':
        return 900;
      case 'normal':
      default:
        return 1800;
    }
  }

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
    }, this.getDelay());
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
          content: `【线索解锁】${discovererName} 发现了【${clue.title}】！内容已收录至线索档案。`,
        });
      }
    }
  }

  // Orchestrates the exact state machine across all 6 phases
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
          this.addMessage({
            senderId: detective.id,
            senderName: detective.name,
            senderAvatar: detective.avatar,
            senderRole: 'DETECTIVE',
            type: 'SPEECH',
            stage: 'STAGE_0_PREP',
            content: `这场密室惨案非同寻常，门窗闭锁、尸体尚存余温。我将严格依循因果律与物证进行推演，在场所有人均有作案嫌疑，包括我自己。`,
          });
          // Transition to stage 1
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
          // Each suspect and detective speaks in order
          const participants = [detective, ...suspects];
          const introIndex = stageStep - 1;

          if (introIndex < participants.length) {
            const char = participants[introIndex];
            const speech = this.getIntroSpeech(char, script);

            this.addMessage({
              senderId: char.id,
              senderName: char.name,
              senderAvatar: char.avatar,
              senderRole: char.roleType,
              type: 'SPEECH',
              stage: 'STAGE_1_INTRO',
              content: speech,
            });
            this.roomState.stageStep++;
          } else {
            // Done with introductions
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
      // STAGE 2: 搜证环节 (Unlock clues dynamically)
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
            content: `【阶段变更：搜证环节】搜证通道已开启，在场人员正对现场、遗体、起居室及机械设施展开地毯式勘查。`,
          });
          this.roomState.stageStep++;
        } else {
          const clueIndex = stageStep - 1;
          const totalClues = script.clues;

          if (clueIndex < totalClues.length) {
            const clue = totalClues[clueIndex];
            // Assign a logical discoverer
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

            // Discoverer announces the search action
            this.addMessage({
              senderId: discoverer.id,
              senderName: discoverer.name,
              senderAvatar: discoverer.avatar,
              senderRole: discoverer.roleType,
              type: 'SPEECH',
              stage: 'STAGE_2_SEARCH',
              content: this.getSearchActionSpeech(discoverer, clue),
            });

            // Unlock clue
            this.unlockClue(clue.id, discoverer.name);
            this.roomState.stageStep++;
          } else {
            // Finished searching all clues
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
          // Provide 6-8 deep rounds of deduction exchanges
          const deductionTurns = 7;
          if (stageStep <= deductionTurns) {
            await this.handleDeductionSpeechTurn(stageStep, detective, suspects, killer);
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
            const voteRecord = this.generateVoteRecord(voter, killer, suspects, detective);

            this.roomState.votes.push(voteRecord);
            this.roomState.characterVoteStatus[voter.id] = true;

            // Submit secret ballot notice (audience can observe the secret reason)
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
              content: `[私聊致DM] 我投给【${voteRecord.targetName}】。推断依据：${voteRecord.reason}`,
            });
            this.roomState.stageStep++;
          } else if (!this.roomState.votesAnnounced) {
            // DM tabulates and announces final results publicly
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
      // STAGE 5: 案件真相复盘 (Truth reveal, motive, method)
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
          this.addMessage({
            senderId: detective.id,
            senderName: detective.name,
            senderAvatar: detective.avatar,
            senderRole: 'DETECTIVE',
            type: 'SPEECH',
            stage: 'STAGE_5_TRUTH',
            content: `正如推理所印证：冰融化后的水渍无法骗人，而齿轮传动轴上那几根高强度的医用丝线，正是连接恶魔手掌的木偶线。无论怎样伪装温和，物理证据永不说谎。`,
          });
          this.roomState.stageStep++;
        } else if (stageStep === 5) {
          this.addMessage({
            senderId: killer.id,
            senderName: killer.name,
            senderAvatar: killer.avatar,
            senderRole: 'SUSPECT',
            type: 'SPEECH',
            stage: 'STAGE_5_TRUTH',
            content: `……被看穿了吗。八年来的敲诈与折磨，我只是夺回本该属于自己的宁静。只可惜，钟摆算准了秒针，却没算准侦探敏锐的眼睛。`,
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

  private getIntroSpeech(char: Character, script: Script): string {
    if (char.roleType === 'DETECTIVE') {
      return `我是受邀调查员【${char.name}】。案发当晚暴风雪肆虐，我一直在书房研究案件卷宗。零点钟声时，我隐约听到了钟楼重锤运作的异响。希望大家如实作证。`;
    }
    return `我是【${char.name}】（${char.title}）。${char.bio} 案发时我的情况是：${char.alibi}。我和死者虽有往来，但绝对没有杀人理由！`;
  }

  private getSearchActionSpeech(char: Character, clue: Clue): string {
    if (clue.type === 'SCENE') {
      return `我正在重点勘验【${clue.sceneLocation || '现场核心区域'}】，发现了一些极不寻常的物理痕迹！请DM核准。`;
    }
    if (clue.type === 'CHARACTER') {
      return `根据先前的动向，我对私人物品展开了细致排查，在角落发现了与死者相关的保密物品！`;
    }
    return `我核对了公共区域的记录，在窗台与户外积雪处找到了关键线索！`;
  }

  private async handleDeductionSpeechTurn(
    turn: number,
    detective: Character,
    suspects: Character[],
    killer: Character
  ) {
    const innocenceSuspect = suspects.find((s) => !s.isKiller) || suspects[0];
    const secondSuspect =
      suspects.find((s) => !s.isKiller && s.id !== innocenceSuspect.id) ||
      suspects[1] ||
      innocenceSuspect;

    switch (turn) {
      case 1:
        this.addMessage({
          senderId: detective.id,
          senderName: detective.name,
          senderAvatar: detective.avatar,
          senderRole: 'DETECTIVE',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: `请大家注意【线索2与线索4】：死者胸口有刺创，现场却没有任何匕首，只有融化水渍；且钟摆齿轮上挂着细韧的外科手术线！这证明凶手利用了融冰延时和重力机构来完成反锁！`,
        });
        break;
      case 2:
        // Killer attempts to deflect suspicion toward another suspect
        this.addMessage({
          senderId: killer.id,
          senderName: killer.name,
          senderAvatar: killer.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: `侦探先生的推论令人惊叹。不过说到利用机械与钢丝，莉莉安学徒不正是精通钟表发条的专家吗？而且工坊恰好少了一卷金属细丝，难道不是更有作案可能？`,
        });
        break;
      case 3:
        // Innocent suspect vigorously defends and points out contradiction
        this.addMessage({
          senderId: innocenceSuspect.id,
          senderName: innocenceSuspect.name,
          senderAvatar: innocenceSuspect.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: `请不要血口喷人！线索4明确记载，缠绕在齿轮上的是特种外科吸收线，根本不是机械工坊的硬质高碳钢丝！而且冰库领用特制棱柱冰模具的签字人到底是谁？！`,
        });
        break;
      case 4:
        // Optional Private Chat between killer and another suspect (audience can inspect!)
        if (this.roomState.allowPrivateChat) {
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
            content: `[私聊] ${secondSuspect.name}，你刚才也看到了维多利亚夫人的催债信。她负债累累最需要遗产，投票时我们把票集中投给她，对你我都最安全。`,
          });
        } else {
          this.addMessage({
            senderId: secondSuspect.id,
            senderName: secondSuspect.name,
            senderAvatar: secondSuspect.avatar,
            senderRole: 'SUSPECT',
            type: 'SPEECH',
            stage: 'STAGE_3_DEDUCTION',
            content: `没错！冰库领料单上明明有查尔斯医生的借调签名！如果只是冷敷扭伤，为什么需要长达20公分的柱状棱角模具？！`,
          });
        }
        break;
      case 5:
        this.addMessage({
          senderId: secondSuspect.id,
          senderName: secondSuspect.name,
          senderAvatar: secondSuspect.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: `更可疑的是，死者遗体几乎没有挣扎打斗痕迹，法医检验报告提示有深度镇痛麻痹反应。谁能无声无息地在伯爵茶水里掺入麻醉药？只有伯爵最信任的家庭医生！`,
        });
        break;
      case 6:
        // Killer tries to defend
        this.addMessage({
          senderId: killer.id,
          senderName: killer.name,
          senderAvatar: killer.avatar,
          senderRole: 'SUSPECT',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: `那只是伯爵日常的失眠镇静配方！我当晚一直在客房生火配药，客房壁炉的灰烬就是铁证！你们不能单凭冰模具的巧合就定我的罪！`,
        });
        break;
      case 7:
        // Detective final strike
        this.addMessage({
          senderId: detective.id,
          senderName: detective.name,
          senderAvatar: detective.avatar,
          senderRole: 'DETECTIVE',
          type: 'SPEECH',
          stage: 'STAGE_3_DEDUCTION',
          content: `查尔斯医生，您恰恰忽略了最关键的一点：昨夜零点的钟声敲响时，钟锤的摆动延误了整整3秒，那正是医用缝线被齿轮切断并挂带冰柱下坠的时间差！线索、动机、时间、工具，所有因果链条全部严丝合缝闭环在您身上！`,
        });
        break;
    }
  }

  private generateVoteRecord(
    voter: Character,
    killer: Character,
    suspects: Character[],
    detective: Character
  ): VoteRecord {
    // If voter is the killer, vote for someone else to deflect
    if (voter.id === killer.id) {
      const target = suspects.find((s) => s.id !== killer.id) || detective;
      return {
        voterId: voter.id,
        voterName: voter.name,
        targetId: target.id,
        targetName: target.name,
        reason: '其具有强烈的经济危机与被剥夺继承权背景，且案发时间段存在独处空白。',
        submittedAt: Date.now(),
      };
    }

    // Detective and astute suspects vote for the real killer based on clues
    return {
      voterId: voter.id,
      voterName: voter.name,
      targetId: killer.id,
      targetName: killer.name,
      reason:
        voter.roleType === 'DETECTIVE'
          ? '外科缝线规格、冰模具借调记录与麻痹剂完全吻合，钟摆密室诡计唯一实施者。'
          : '现场水渍与冰模具线索无法辩驳，且其接触死者药物具有绝对便利。',
      submittedAt: Date.now(),
    };
  }
}
