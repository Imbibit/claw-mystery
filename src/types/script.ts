export type GameStage =
  | 'STAGE_0_PREP' // 开局准备
  | 'STAGE_1_INTRO' // 自我介绍
  | 'STAGE_2_SEARCH' // 搜证环节
  | 'STAGE_3_DEDUCTION' // 集中推理
  | 'STAGE_4_VOTE' // 匿名投票
  | 'STAGE_5_TRUTH' // 案件复盘
  | 'STAGE_6_ENDED'; // 推演结束

export const STAGE_NAMES: Record<GameStage, string> = {
  STAGE_0_PREP: '阶段0: 开局准备',
  STAGE_1_INTRO: '阶段1: 自我介绍',
  STAGE_2_SEARCH: '阶段2: 搜证环节',
  STAGE_3_DEDUCTION: '阶段3: 集中推理',
  STAGE_4_VOTE: '阶段4: 匿名投票',
  STAGE_5_TRUTH: '阶段5: 案件复盘',
  STAGE_6_ENDED: '推演结束',
};

export type RoleType = 'DM' | 'DETECTIVE' | 'SUSPECT';

export interface Character {
  id: string;
  name: string;
  title: string;
  avatar: string;
  roleType: RoleType;
  isKiller: boolean; // 隐藏信息，复盘前对观众隐藏凶手标签
  bio: string;
  secret: string;
  alibi: string;
  personality: string;
}

export type ClueType = 'PUBLIC' | 'CHARACTER' | 'SCENE';

export interface Clue {
  id: string;
  title: string;
  content: string;
  type: ClueType;
  targetCharacterId?: string;
  sceneLocation?: string;
  unlockCondition: string;
  isUnlocked?: boolean;
  unlockedAt?: number;
  unlockedBy?: string;
}

export interface TruthReveal {
  killerId: string;
  killerName: string;
  motive: string;
  method: string;
  timeline: string[];
  easterEggs: string[];
}

export interface Script {
  id: string;
  title: string;
  summary: string;
  background: string;
  playerCount: number;
  difficulty: '简单' | '中等' | '烧脑困难';
  tags: string[];
  coverImage?: string;
  characters: Character[];
  clues: Clue[];
  truth: TruthReveal;
  createdAt: string;
}

export type MessageType =
  | 'SPEECH'
  | 'DM_SYSTEM'
  | 'STAGE_CHANGE'
  | 'CLUE_DISCOVERED'
  | 'VOTE_SUBMIT'
  | 'TRUTH_REVEAL';

export interface ChatMessage {
  id: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: 'DM' | 'DETECTIVE' | 'SUSPECT' | 'SYSTEM';
  type: MessageType;
  content: string;
  isPrivate?: boolean;
  privateTargetName?: string;
  privateTargetId?: string;
  stage: GameStage;
}

export interface VoteRecord {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
  reason: string;
  submittedAt: number;
}

export type EngineMode = 'LOCAL_AUTONOMOUS' | 'GEMINI_AI' | 'REMOTE_OPENCLAW';

export interface OpenClawConfig {
  serverUrl: string;
  wsUrl: string;
  apiToken: string;
  engineMode: EngineMode;
  speed: 'slow' | 'normal' | 'fast'; // slow: 3200ms, normal: 1800ms, fast: 900ms
  allowPrivateChat: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'simulated';
}

export interface RoomState {
  roomId: string;
  script: Script;
  currentStage: GameStage;
  stageStep: number;
  isPlaying: boolean;
  speed: 'slow' | 'normal' | 'fast';
  allowPrivateChat: boolean;
  engineMode: EngineMode;
  messages: ChatMessage[];
  unlockedClueIds: string[];
  votes: VoteRecord[];
  votesAnnounced: boolean;
  startTime: number;
  characterVoteStatus: Record<string, boolean>; // id -> has submitted vote
}
