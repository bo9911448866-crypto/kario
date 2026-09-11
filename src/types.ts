export interface ClassItem {
  id: string;
  name: string;
  color: string; // Tailwind-friendly hex or color identifier
  bgColor: string;
  textColor: string;
  borderColor: string;
  description?: string;
  createdAt: string;
}

export interface NoteSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  tags: string[];
  generatedAt: string;
}

export interface VoiceNote {
  id: string;
  title: string;
  classId: string;
  transcript: string;
  audioUrl?: string; // base64 data url or object url
  audioMimeType?: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
  summary?: NoteSummary;
  isSummarizing?: boolean;
  error?: string;
}

export interface GeminiApiStatus {
  hasConfiguredKey: boolean;
  source: 'environment' | 'custom' | 'none';
}

export type SortOrder = 'newest' | 'oldest' | 'duration' | 'title';

export type PresetThemeId =
  | 'obsidian-flame'
  | 'midnight-cyberpunk'
  | 'cosmic-nebula'
  | 'emerald-forest'
  | 'nordic-slate'
  | 'warm-espresso'
  | 'sunset-crimson'
  | 'pure-light';

export type BackgroundPatternType =
  | 'fire'
  | 'grid'
  | 'nebula'
  | 'waves'
  | 'none';

export interface CustomThemeConfig {
  presetId: PresetThemeId | 'custom';
  mode: 'dark' | 'light';
  primaryColor: string; // hex
  secondaryColor: string; // hex
  customBackgroundColor?: string; // hex
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
  cardGlow: 'none' | 'subtle' | 'vibrant';
  glassmorphism: boolean;

  // Background Customization
  backgroundPattern: BackgroundPatternType;
  customWallpaperUrl?: string;
  wallpaperOpacity: number; // 0.1 to 1.0
  wallpaperBlur: number; // 0 to 25 px

  // Fire / Flame Effects
  fireIntensity: 'off' | 'subtle' | 'normal' | 'blazing';
  fireEmberCount: number;
  showBaseFlames: boolean;

  // Live Video Background (MP4 / WebM)
  liveVideoUrl?: string;
  videoOpacity?: number; // 0.1 to 1.0
  videoBlur?: number; // 0 to 20 px

  // Live Audio Soundscape (MP3)
  liveAudioUrl?: string;
  audioVolume?: number; // 0 to 1.0
  isAudioPlaying?: boolean;
  audioTrackTitle?: string;

  // Content Visibility & Readability
  contentScrimOpacity?: number; // 0.0 to 0.95 (how dark the background is behind cards)
  cardStyle?: 'solid' | 'frosted';
  zenMode?: boolean; // When true, hides UI on page for pure background screensaver view
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface EmailSettings {
  recipientEmail?: string;
  autoSendNotes: boolean;
  lastSentAt?: string;
}

export interface CloudSyncStatus {
  isSynced: boolean;
  lastSyncedAt?: string;
  isSyncing: boolean;
  error?: string;
}
