import { ClassItem, VoiceNote, CustomThemeConfig } from '../types';
import { DEFAULT_THEME_CONFIG } from './ThemePresets';

const STORAGE_KEYS = {
  CLASSES: 'voice_notes_classes_v1',
  NOTES: 'voice_notes_list_v1',
  CUSTOM_API_KEY: 'voice_notes_custom_api_key_v1',
  THEME: 'voice_notes_theme_v1',
  THEME_CONFIG: 'kairo_theme_config_v3',
};

export const CLASS_COLORS = [
  { name: 'Emerald', color: '#10b981', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-700 dark:text-emerald-300', borderColor: 'border-emerald-300 dark:border-emerald-800' },
  { name: 'Amber', color: '#f59e0b', bgColor: 'bg-amber-500/10', textColor: 'text-amber-700 dark:text-amber-300', borderColor: 'border-amber-300 dark:border-amber-800' },
  { name: 'Blue', color: '#3b82f6', bgColor: 'bg-blue-500/10', textColor: 'text-blue-700 dark:text-blue-300', borderColor: 'border-blue-300 dark:border-blue-800' },
  { name: 'Purple', color: '#8b5cf6', bgColor: 'bg-purple-500/10', textColor: 'text-purple-700 dark:text-purple-300', borderColor: 'border-purple-300 dark:border-purple-800' },
  { name: 'Rose', color: '#f43f5e', bgColor: 'bg-rose-500/10', textColor: 'text-rose-700 dark:text-rose-300', borderColor: 'border-rose-300 dark:border-rose-800' },
  { name: 'Cyan', color: '#06b6d4', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-700 dark:text-cyan-300', borderColor: 'border-cyan-300 dark:border-cyan-800' },
];

const INITIAL_CLASSES: ClassItem[] = [
  {
    id: 'class-bio',
    name: 'Biology',
    color: '#10b981',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-800',
    description: 'Cellular biology, genetics, and ecology lectures',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'class-hist',
    name: 'History',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
    description: 'Modern European history and global conflicts',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'class-math',
    name: 'Math',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-800',
    description: 'Linear algebra, eigenvalues, and multivariable calculus',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'class-cs',
    name: 'Computer Science',
    color: '#8b5cf6',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-300 dark:border-purple-800',
    description: 'Data structures, algorithms, and system design',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

// Generates a short silent or harmonic audio buffer data url for sample notes
function createSynthesizedAudioDataUrl(durationSec = 5): string {
  try {
    const sampleRate = 8000;
    const numSamples = sampleRate * durationSec;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Gentle tone
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 0.5) * 0.2;
      const intSample = Math.max(-32768, Math.min(32767, sample * 32767));
      view.setInt16(44 + i * 2, intSample, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

const INITIAL_NOTES: VoiceNote[] = [
  {
    id: 'note-1',
    title: 'Cellular Respiration & ATP Production',
    classId: 'class-bio',
    durationSeconds: 142,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    transcript:
      'In today\'s lecture we discussed glycolysis, the Krebs cycle, and oxidative phosphorylation. Glycolysis breaks down glucose in the cytoplasm into two pyruvate molecules, yielding a net gain of 2 ATP and 2 NADH. Then the pyruvates enter the mitochondrial matrix where the citric acid cycle runs. The electron transport chain on the inner mitochondrial membrane creates a proton gradient across the cristae, driving ATP synthase. Under aerobic conditions, a single glucose molecule yields approximately 30 to 32 ATP molecules. Important reminder for the midterm: review the difference between substrate-level phosphorylation and oxidative phosphorylation.',
    summary: {
      summary:
        'A comprehensive lecture overviewing the three primary stages of cellular respiration (glycolysis, Krebs cycle, and oxidative phosphorylation) and how ATP synthase exploits the mitochondrial proton gradient to generate roughly 30-32 ATP per glucose.',
      keyPoints: [
        'Glycolysis occurs in cytoplasm, splitting glucose into 2 pyruvate with net +2 ATP & +2 NADH.',
        'Krebs Cycle takes place inside the mitochondrial matrix, producing NADH, FADH2, and CO2.',
        'Oxidative phosphorylation on the inner mitochondrial membrane drives ATP synthase via a proton gradient.',
        'Aerobic cellular respiration produces approximately 30-32 net ATP molecules.',
      ],
      actionItems: [
        'Study the distinction between substrate-level phosphorylation and oxidative phosphorylation before midterm.',
        'Draw the electron transport chain complex I through IV and ATP synthase diagram.',
      ],
      tags: ['Biology', 'ATP', 'Glycolysis', 'Mitochondria', 'Cellular Respiration'],
      generatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  },
  {
    id: 'note-2',
    title: 'The Industrial Revolution & Steam Power',
    classId: 'class-hist',
    durationSeconds: 195,
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    transcript:
      'Professor Martinez covered the shift from agrarian economies to mechanized manufacturing during the 18th century in Great Britain. Key factors included abundant coal deposits, access to raw cotton from colonies, and James Watt\'s enhancements to the steam engine. The steam engine revolutionized textile production, iron smelting, and locomotive transportation. However, rapid urbanization created severe public health crises, tenement overcrowding, and harsh child labor conditions, which spurred the early labor union movement and factory acts of the 1830s.',
    summary: {
      summary:
        'Explores the economic, technological, and sociological dimensions of the British Industrial Revolution, focusing on James Watt\'s steam engine innovations, urbanization pressures, and early labor reform legislation.',
      keyPoints: [
        'Great Britain possessed crucial preconditions: coal reserves, iron ore, capital, and colonial trade routes.',
        'James Watt\'s improved condenser on the steam engine decoupled factories from riverbanks.',
        'Rapid urban migration resulted in unsanitary tenements and hazardous factory conditions.',
        'Social backlash sparked the Factory Acts and the emergence of organized labor unions.',
      ],
      actionItems: [
        'Read Chapter 4 on the Factory Act of 1833 for the upcoming seminar discussion.',
        'Compare the cottage industry system with the centralized factory discipline model.',
      ],
      tags: ['History', 'Industrial Revolution', 'Steam Engine', 'Labor Reform', 'Urbanization'],
      generatedAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    },
  },
  {
    id: 'note-3',
    title: 'Eigenvectors, Eigenvalues & Matrix Diagonalization',
    classId: 'class-math',
    durationSeconds: 168,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    transcript:
      'We introduced the fundamental definition: A times v equals lambda times v, where v is a non-zero eigenvector and lambda is the eigenvalue scalar. To solve for eigenvalues, compute the characteristic polynomial by taking the determinant of (A minus lambda times the identity matrix) and set it to zero. Once you find the roots, plug each lambda back into the system (A - lambda I)v = 0 to determine the corresponding eigenspace basis vectors. If an n by n matrix has n linearly independent eigenvectors, it can be diagonalized as P times D times P inverse.',
    summary: {
      summary:
        'Technical lecture covering linear transformations where vector directions are preserved (eigenvectors), solving characteristic equations via det(A - λI) = 0, and diagonalizing square matrices into PDP⁻¹.',
      keyPoints: [
        'Eigen equation: Av = λv with non-zero vector v and scalar eigenvalue λ.',
        'Characteristic equation det(A - λI) = 0 yields eigenvalues as polynomial roots.',
        'Eigenspaces are found by determining the null space of (A - λI).',
        'Matrix A is diagonalizable if and only if it has n linearly independent eigenvectors.',
      ],
      actionItems: [
        'Complete textbook problem set 5.2 exercises 3, 7, 12 on finding eigenspaces of 3x3 matrices.',
        'Review the geometric interpretation of shears versus rotations with respect to real eigenvalues.',
      ],
      tags: ['Math', 'Linear Algebra', 'Eigenvalues', 'Matrix Diagonalization', 'Eigenspace'],
      generatedAt: new Date(Date.now() - 86400000 * 2.8).toISOString(),
    },
  },
];

export const StorageService = {
  getClasses(): ClassItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading classes from storage', e);
    }
    this.saveClasses(INITIAL_CLASSES);
    return INITIAL_CLASSES;
  },

  saveClasses(classes: ClassItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    } catch (e) {
      console.error('Error saving classes to storage', e);
    }
  },

  createClass(name: string, colorSchemeIndex = 0, description?: string): ClassItem {
    const classes = this.getClasses();
    const colorScheme = CLASS_COLORS[colorSchemeIndex % CLASS_COLORS.length];
    const newClass: ClassItem = {
      id: `class-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      color: colorScheme.color,
      bgColor: colorScheme.bgColor,
      textColor: colorScheme.textColor,
      borderColor: colorScheme.borderColor,
      description: description?.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...classes, newClass];
    this.saveClasses(updated);
    return newClass;
  },

  updateClass(id: string, updates: Partial<ClassItem>): ClassItem[] {
    const classes = this.getClasses();
    const updated = classes.map((c) => (c.id === id ? { ...c, ...updates } : c));
    this.saveClasses(updated);
    return updated;
  },

  deleteClass(id: string, fallbackClassId?: string): { classes: ClassItem[]; notes: VoiceNote[] } {
    const classes = this.getClasses().filter((c) => c.id !== id);
    this.saveClasses(classes);

    // Reassign or keep notes
    const notes = this.getNotes().map((note) => {
      if (note.classId === id) {
        return {
          ...note,
          classId: fallbackClassId || (classes[0]?.id ?? 'general'),
          updatedAt: new Date().toISOString(),
        };
      }
      return note;
    });
    this.saveNotes(notes);

    return { classes, notes };
  },

  getNotes(): VoiceNote[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (data) {
        const parsed: VoiceNote[] = JSON.parse(data);
        return parsed.map((note) => {
          if (!note.audioUrl && note.durationSeconds > 0) {
            note.audioUrl = createSynthesizedAudioDataUrl(Math.min(note.durationSeconds, 8));
          }
          return note;
        });
      }
    } catch (e) {
      console.error('Error reading notes from storage', e);
    }
    this.saveNotes(INITIAL_NOTES);
    return INITIAL_NOTES;
  },

  saveNotes(notes: VoiceNote[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch (e) {
      console.error('Error saving notes to storage', e);
    }
  },

  createNote(note: Omit<VoiceNote, 'id' | 'createdAt' | 'updatedAt'>): VoiceNote {
    const notes = this.getNotes();
    const newNote: VoiceNote = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    this.saveNotes(updated);
    return newNote;
  },

  updateNote(id: string, updates: Partial<VoiceNote>): VoiceNote[] {
    const notes = this.getNotes();
    const updated = notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    this.saveNotes(updated);
    return updated;
  },

  deleteNote(id: string): VoiceNote[] {
    const notes = this.getNotes().filter((n) => n.id !== id);
    this.saveNotes(notes);
    return notes;
  },

  moveNoteToClass(noteId: string, targetClassId: string): VoiceNote[] {
    return this.updateNote(noteId, { classId: targetClassId });
  },

  getUserApiKey(): string {
    return localStorage.getItem(STORAGE_KEYS.CUSTOM_API_KEY) || '';
  },

  saveUserApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_API_KEY);
    }
  },

  removeUserApiKey(): void {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_API_KEY);
  },

  getTheme(): 'light' | 'dark' {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  saveTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getThemeConfig(): CustomThemeConfig {
    try {
      let raw = localStorage.getItem(STORAGE_KEYS.THEME_CONFIG);
      if (!raw) {
        // Check legacy key if any
        const legacy = localStorage.getItem('kairo_theme_config_v2');
        if (legacy) {
          const legacyParsed = JSON.parse(legacy);
          if (legacyParsed.presetId === 'obsidian-flame') {
            this.saveThemeConfig(DEFAULT_THEME_CONFIG);
            return { ...DEFAULT_THEME_CONFIG };
          }
          raw = legacy;
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.presetId === 'obsidian-flame') {
          this.saveThemeConfig(DEFAULT_THEME_CONFIG);
          return { ...DEFAULT_THEME_CONFIG };
        }
        const config: CustomThemeConfig = { ...DEFAULT_THEME_CONFIG, ...parsed };

        // Migrate legacy 403-blocked mixkit URLs to ultra-reliable local video assets
        if (config.liveVideoUrl && typeof config.liveVideoUrl === 'string') {
          if (config.liveVideoUrl.includes('mixkit.co')) {
            if (config.liveVideoUrl.includes('rain')) {
              config.liveVideoUrl = '/videos/rainfall.mp4';
            } else if (config.liveVideoUrl.includes('sea') || config.liveVideoUrl.includes('wave') || config.liveVideoUrl.includes('beach')) {
              config.liveVideoUrl = '/videos/ocean.mp4';
            } else if (config.liveVideoUrl.includes('star') || config.liveVideoUrl.includes('space')) {
              config.liveVideoUrl = '/videos/cosmic_nebula.mp4';
            } else if (config.liveVideoUrl.includes('neon') || config.liveVideoUrl.includes('tunnel')) {
              config.liveVideoUrl = '/videos/cyber_grid.mp4';
            } else if (config.liveVideoUrl.includes('stream') || config.liveVideoUrl.includes('forest')) {
              config.liveVideoUrl = '/videos/aurora_drift.mp4';
            } else {
              config.liveVideoUrl = '/videos/fireplace.mp4';
            }
          }
        }

        return config;
      }
    } catch (e) {
      console.warn('Failed to parse theme config from storage, resetting to default');
    }
    return { ...DEFAULT_THEME_CONFIG };
  },

  saveThemeConfig(config: CustomThemeConfig): void {
    try {
      // Create a clean serializable object to avoid any circular references
      const safeConfig: CustomThemeConfig = {
        presetId: config.presetId,
        mode: config.mode,
        primaryColor: String(config.primaryColor || '#9333ea'),
        secondaryColor: String(config.secondaryColor || '#c084fc'),
        customBackgroundColor: config.customBackgroundColor ? String(config.customBackgroundColor) : undefined,
        borderRadius: config.borderRadius,
        cardGlow: config.cardGlow,
        glassmorphism: Boolean(config.glassmorphism),
        backgroundPattern: config.backgroundPattern,
        customWallpaperUrl: config.customWallpaperUrl ? String(config.customWallpaperUrl) : undefined,
        wallpaperOpacity: Number(config.wallpaperOpacity ?? 0.45),
        wallpaperBlur: Number(config.wallpaperBlur ?? 2),
        fireIntensity: config.fireIntensity,
        fireEmberCount: Number(config.fireEmberCount ?? 65),
        showBaseFlames: Boolean(config.showBaseFlames),
        liveVideoUrl: config.liveVideoUrl ? String(config.liveVideoUrl) : undefined,
        videoOpacity: config.videoOpacity !== undefined ? Number(config.videoOpacity) : 0.55,
        videoBlur: config.videoBlur !== undefined ? Number(config.videoBlur) : 1,
        liveAudioUrl: config.liveAudioUrl ? String(config.liveAudioUrl) : undefined,
        audioVolume: config.audioVolume !== undefined ? Number(config.audioVolume) : 0.5,
        isAudioPlaying: Boolean(config.isAudioPlaying),
        audioTrackTitle: config.audioTrackTitle ? String(config.audioTrackTitle) : undefined,
        contentScrimOpacity: config.contentScrimOpacity !== undefined ? Number(config.contentScrimOpacity) : 0.75,
        cardStyle: config.cardStyle || 'solid',
        zenMode: Boolean(config.zenMode),
      };

      localStorage.setItem(STORAGE_KEYS.THEME_CONFIG, JSON.stringify(safeConfig));
    } catch (e) {
      console.warn('Failed to save theme config to localStorage');
    }
  },
};
