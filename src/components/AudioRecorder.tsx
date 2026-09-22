import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  RefreshCw,
  Sparkles,
  Check,
  AlertCircle,
  X,
  Volume2,
  FileAudio,
  CheckCircle2,
  Tag,
  GraduationCap,
  Wand2,
} from 'lucide-react';
import { ClassItem, VoiceNote, NoteAnalysisResult } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { GeminiService } from '../services/GeminiService';

interface AudioRecorderProps {
  classes: ClassItem[];
  defaultClassId?: string;
  onSaveNote: (note: Omit<VoiceNote, 'id' | 'createdAt' | 'updatedAt'>, shouldSummarize?: boolean) => void;
  onClose: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  classes,
  defaultClassId,
  onSaveNote,
  onClose,
}) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Form / Content state
  const [title, setTitle] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId || '');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isTranscribingWithGemini, setIsTranscribingWithGemini] = useState(false);
  const [isAnalyzingWithAi, setIsAnalyzingWithAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<NoteAnalysisResult | null>(null);
  const [aiStatusSuccess, setAiStatusSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if available in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechApiSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += trans + ' ';
          } else {
            currentInterim += trans;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${currentFinal.trim()}` : currentFinal.trim()));
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        // 'no-speech' is common and harmless
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition warning:', event.error);
        }
      };

      recognition.onend = () => {
        // If user is still recording and didn't pause, restart recognition loop
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            recognition.start();
          } catch {
            // ignore restart collision
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
      setSpeechApiSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCanvasVisualization();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        // Dark Purple Fire Gradient styling
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, Math.max(0, canvas.height - barHeight));
        gradient.addColorStop(0, '#3b0764');
        gradient.addColorStop(0.5, '#9333ea');
        gradient.addColorStop(0.9, '#c084fc');
        gradient.addColorStop(1, '#f3e8ff');

        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
        ctx.shadowBlur = 4;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        ctx.shadowBlur = 0;

        x += barWidth + 1;
      }
    };

    render();
  }, []);

  const stopCanvasVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Web Audio API setup for live visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      drawVisualizer();

      // MediaRecorder setup
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);

        stopCanvasVisualization();
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start(250); // collect chunk every 250ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start SpeechRecognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('SpeechRecognition start notice:', e);
        }
      }

      // Default auto-title if empty
      if (!title) {
        const now = new Date();
        const className = classes.find((c) => c.id === selectedClassId)?.name || 'Class';
        setTitle(`${className} Lecture - ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`);
      }
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone permissions in your browser.'
          : 'Could not access microphone. Please check your audio device settings.'
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // ignore
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setInterimTranscript('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMsg('Please select a valid audio file (.mp3, .wav, .m4a, .webm, .ogg).');
      return;
    }

    setErrorMsg(null);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setRecordedAudioUrl(url);

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }

    // Estimate duration or load audio metadata
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setRecordingTime(Math.round(tempAudio.duration || 60));
    };

    // Trigger AI transcription for uploaded audio
    handleGeminiTranscribe(file);
  };

  const handleGeminiTranscribe = async (blobToTranscribe?: Blob) => {
    const targetBlob = blobToTranscribe || audioBlob;
    if (!targetBlob) return;

    setIsTranscribingWithGemini(true);
    setErrorMsg(null);

    try {
      const text = await GeminiService.transcribeAudio(targetBlob);
      if (text) {
        setTranscript((prev) => (prev ? `${prev}\n\n${text}` : text));
      }
    } catch (err: any) {
      console.warn('Gemini transcription notice:', err);
      // Non-fatal: user can still type or use speech transcript
      setErrorMsg(
        err.message?.includes('GEMINI_API_KEY')
          ? 'Gemini transcription requires an API key. You can still type notes manually.'
          : err.message || 'Speech-to-text transcription was unable to complete.'
      );
    } finally {
      setIsTranscribingWithGemini(false);
    }
  };

  const handleAiAutoDetectAndPolish = async () => {
    const rawText = transcript.trim() || interimTranscript.trim();
    if (!rawText) {
      setErrorMsg('Please record speech or enter notes first so AI can analyze the topics, grammar, and class.');
      return;
    }

    setIsAnalyzingWithAi(true);
    setErrorMsg(null);
    setAiStatusSuccess(null);

    try {
      const result = await GeminiService.analyzeNote({
        text: rawText,
        classes: classes.map((c) => ({ id: c.id, name: c.name })),
      });

      if (result.title) {
        setTitle(result.title);
      }
      if (result.cleanedTranscript) {
        setTranscript(result.cleanedTranscript);
        setInterimTranscript('');
      }
      if (result.classId && classes.some((c) => c.id === result.classId)) {
        setSelectedClassId(result.classId);
      }

      setAiAnalysisResult(result);
      const matchedClass = classes.find((c) => c.id === result.classId);
      const msg = matchedClass
        ? `Topics detected & mapped to "${matchedClass.name}". Title & grammar polished!`
        : 'Topics detected & descriptive title generated. Grammar polished!';
      setAiStatusSuccess(msg);
    } catch (err: any) {
      console.warn('AI analysis error:', err);
      setErrorMsg(
        err.message?.includes('GEMINI_API_KEY')
          ? 'Gemini API key is required for auto-topic detection and class mapping.'
          : err.message || 'Could not auto-analyze note with AI.'
      );
    } finally {
      setIsAnalyzingWithAi(false);
    }
  };

  const handleSave = (shouldSummarize = false) => {
    if (!shouldSummarize && !title.trim()) {
      setErrorMsg('Please enter a note title.');
      return;
    }

    const finalTranscript = transcript.trim() || interimTranscript.trim() || '(No spoken audio detected)';

    onSaveNote(
      {
        title: title.trim() || 'AI Processing...',
        classId: selectedClassId,
        transcript: finalTranscript,
        audioUrl: recordedAudioUrl || undefined,
        audioMimeType: audioBlob?.type || 'audio/webm',
        durationSeconds: recordingTime || 1,
        detectedTopics: aiAnalysisResult?.detectedTopics || undefined,
        grammarNotes: aiAnalysisResult?.grammarNotes || undefined,
      },
      shouldSummarize
    );

    onClose();
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div
      id="audio-recorder-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="audio-recorder-card"
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Record Voice Note
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                AI captures, detects topics, fixes grammar & auto-classes your note
              </p>
            </div>
          </div>
          <button
            id="close-recorder-button"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close recorder"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* AI Success Feedback Banner */}
          {aiStatusSuccess && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-zinc-900 dark:text-white" />
              <div className="flex-1 space-y-1">
                <p className="font-medium">{aiStatusSuccess}</p>
                {aiAnalysisResult?.detectedTopics && aiAnalysisResult.detectedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {aiAnalysisResult.detectedTopics.map((top, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                      >
                        <Tag className="h-2.5 w-2.5 text-zinc-400" />
                        {top}
                      </span>
                    ))}
                  </div>
                )}
                {aiAnalysisResult?.grammarNotes && (
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-0.5">
                    <span className="font-semibold">Grammar:</span> {aiAnalysisResult.grammarNotes}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAiStatusSuccess(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Recording Canvas & Controls View */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-6 border border-zinc-200/80 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
            {/* Live Visualizer Canvas */}
            <div className="w-full h-20 flex items-center justify-center mb-3">
              {isRecording ? (
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={80}
                  className="w-full max-w-md h-20 rounded-lg bg-zinc-900/50"
                />
              ) : recordedAudioUrl ? (
                <div className="w-full max-w-md">
                  <AudioPlayer src={recordedAudioUrl} duration={recordingTime} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs">
                  <Volume2 className="h-8 w-8 mb-1 stroke-1 text-zinc-300 dark:text-zinc-600" />
                  <span>Ready to record voice audio</span>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
              {formatTimer(recordingTime)}
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-3">
              {!isRecording && !recordedAudioUrl && (
                <>
                  <button
                    id="start-recording-btn"
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold shadow-md active:scale-95 transition-all cursor-pointer text-sm"
                  >
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span>Start Recording</span>
                  </button>

                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer shadow-xs transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Upload Audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </>
              )}

              {isRecording && (
                <>
                  {isPaused ? (
                    <button
                      id="resume-recording-btn"
                      type="button"
                      onClick={resumeRecording}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all cursor-pointer active:scale-95 text-xs"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Resume</span>
                    </button>
                  ) : (
                    <button
                      id="pause-recording-btn"
                      type="button"
                      onClick={pauseRecording}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm transition-all cursor-pointer active:scale-95 text-xs"
                    >
                      <Pause className="h-4 w-4 fill-current" />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    id="stop-recording-btn"
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition-all cursor-pointer active:scale-95 text-xs"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    <span>Stop Recording</span>
                  </button>
                </>
              )}

              {!isRecording && recordedAudioUrl && (
                <div className="flex items-center gap-2">
                  <button
                    id="re-record-btn"
                    type="button"
                    onClick={() => {
                      setRecordedAudioUrl(null);
                      setAudioBlob(null);
                      setRecordingTime(0);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Re-record</span>
                  </button>

                  <button
                    id="gemini-transcribe-btn"
                    type="button"
                    onClick={() => handleGeminiTranscribe()}
                    disabled={isTranscribingWithGemini}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTranscribingWithGemini ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isTranscribingWithGemini ? 'Transcribing...' : 'AI Transcribe Audio'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Detection & Auto-Classify Trigger Bar */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  AI Auto-Classify & Grammar Polish
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Detects key topics, fixes grammar & punctuation, assigns class, and names note
                </p>
              </div>
            </div>

            <button
              id="ai-autoclassify-polish-btn"
              type="button"
              onClick={handleAiAutoDetectAndPolish}
              disabled={isAnalyzingWithAi}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
            >
              {isAnalyzingWithAi ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{isAnalyzingWithAi ? 'Detecting Topics & Class...' : 'Auto-Detect & Classify'}</span>
            </button>
          </div>

          {/* Form Fields: Title and Class Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="note-title-input"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5"
              >
                Note Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="note-title-input"
                type="text"
                placeholder="Leave blank to let AI auto-generate title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              />
            </div>

            <div>
              <label
                htmlFor="class-select"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5"
              >
                Assign to Class / Subject
              </label>
              <select
                id="class-select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
              >
                <option value="">✨ Auto-detect with AI</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Transcript / Note Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="transcript-textarea"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Transcript / Spoken Notes
              </label>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {isRecording && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Speech-to-Text
                  </span>
                )}
                {!speechApiSupported && (
                  <span className="text-amber-600 dark:text-amber-400">
                    (Speech API not supported; click AI Transcribe after recording)
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                id="transcript-textarea"
                rows={5}
                placeholder="Spoken words will automatically transcribe here, or you can paste/type directly..."
                value={transcript + (interimTranscript ? ` ${interimTranscript}` : '')}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-normal leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            id="cancel-recorder-btn"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="save-note-btn"
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 text-sm font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4 text-zinc-900 dark:text-white" />
              <span>Save Note</span>
            </button>

            <button
              id="save-and-summarize-btn"
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-sm font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Format & Summarize</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
