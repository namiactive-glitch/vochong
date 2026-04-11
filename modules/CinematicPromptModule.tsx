
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw,
  Download,
  BookOpen,
  ChevronRight,
  Loader2,
  Lightbulb,
  Clapperboard,
  Scissors,
  Send,
  Plus,
  Minus,
  Trash2,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Clock,
  Zap
} from 'lucide-react';
import { suggestIdeas, generateScreenplay, breakdownScenes, generateFinalPrompt } from '../services/promptService';
import { CinematicPrompt, Screenplay, IdeaSuggestion, Episode, Scene, Character } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, Shield, Zap as ZapIcon, Shirt, Sparkle } from 'lucide-react';
import { loadState, saveState } from '../services/persistenceService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CHARACTER_COLORS = [
  'bg-rose-500', 
  'bg-pink-500', 
  'bg-fuchsia-500', 
  'bg-purple-500', 
  'bg-rose-400', 
  'bg-pink-400', 
  'bg-fuchsia-400', 
  'bg-purple-400'
];

const MAIN_CHARACTER_NAMES = [
  'hùng', 'lan', 'vợ', 'chồng', 'mẹ vợ', 'bố vợ', 'mẹ chồng', 'bố chồng', 'hàng xóm'
];

const detectCharacters = (text: string, existingCharacters: Character[] = []): Character[] => {
  const characters: Character[] = [...existingCharacters];
  const lowerText = text.toLowerCase();
  
  // 1. Tìm theo định dạng [Tên] hoặc @1 (Tên)
  const regex = /(?:@(\d+)\s*\(([^)]+)\)|\[([^\]]+)\])/g;
  let match;
  let idCounter = characters.length + 1;
  
  while ((match = regex.exec(text)) !== null) {
    const id = match[1] || String(idCounter++);
    const name = (match[2] || match[3]).trim();
    
    // Tìm mô tả ngay sau tên nhân vật (ví dụ: [Tên] - mô tả)
    // Chúng ta không dùng regex chính để bắt mô tả để tránh nuốt mất các tag nhân vật tiếp theo
    const remainingText = text.substring(regex.lastIndex);
    const descMatch = remainingText.match(/^\s*-\s*([^.\n,\[]+)/);
    const description = descMatch ? descMatch[1].trim() : undefined;
    
    const existing = characters.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      addCharacter(name, id, characters, description);
    } else if (description && !existing.description) {
      existing.description = description;
    }
  }

  // 2. Tìm theo danh sách tên nhân vật chính (nếu chưa được tìm thấy)
  MAIN_CHARACTER_NAMES.forEach(mainName => {
    if (lowerText.includes(mainName)) {
      if (!characters.find(c => c.name.toLowerCase().includes(mainName))) {
        // Tìm tên đầy đủ trong text nếu có thể
        const startIdx = lowerText.indexOf(mainName);
        // Giả định tên dài khoảng 2-4 từ
        const rawName = text.substring(startIdx, startIdx + 20).split(/[.,!?;:\n]/)[0].trim();
        addCharacter(rawName || mainName, String(idCounter++), characters);
      }
    }
  });
  
  return characters;
};

const addCharacter = (name: string, id: string, characters: Character[], description?: string) => {
  const lowerName = name.toLowerCase();
  let gender: 'male' | 'female' = 'male';
  const femaleMarkers = ['vợ', 'lan', 'mai', 'hồng', 'tuyết', 'ngọc', 'linh', 'trang', 'thảo', 'phương', 'hạnh', 'hiền', 'anh', 'nhi', 'vy', 'quỳnh', 'ngân', 'thơm', 'mẹ'];
  const maleMarkers = ['chồng', 'hùng', 'văn', 'tuấn', 'dũng', 'cường', 'minh', 'nam', 'sơn', 'hải', 'long', 'thành', 'trung', 'kiên', 'hoàng', 'huy', 'đức', 'việt', 'bố'];

  const isFemale = femaleMarkers.some(m => lowerName.includes(m));
  const isMale = maleMarkers.some(m => lowerName.includes(m));

  if (isFemale && !isMale) gender = 'female';
  else if (isMale) gender = 'male';
  
  const isMain = MAIN_CHARACTER_NAMES.some(mainName => lowerName.includes(mainName));
  
  characters.push({
    id,
    name,
    gender,
    isMain,
    useCameoOutfit: isMain,
    color: CHARACTER_COLORS[characters.length % CHARACTER_COLORS.length],
    description
  });
};

const CinematicPromptModule: React.FC<{ mode: 'dialogue' | 'no-dialogue' }> = ({ mode }) => {
  const [step, setStep] = useState(() => loadState('cinematic_step', 1));
  const [loading, setLoading] = useState(false);
  
  // Step 1: Idea
  const [idea, setIdea] = useState(() => loadState('cinematic_idea', ''));
  const [suggestions, setSuggestions] = useState<IdeaSuggestion[]>(() => loadState('cinematic_suggestions', []));
  
  // Step 2: Screenplay
  const [numEpisodes, setNumEpisodes] = useState(() => loadState('cinematic_numEpisodes', 6));
  const [durationPerEpisode, setDurationPerEpisode] = useState(() => loadState('cinematic_durationPerEpisode', 1));
  const [screenplay, setScreenplay] = useState<Screenplay | null>(() => loadState('cinematic_screenplay', null));
  const screenplayRef = React.useRef<Screenplay | null>(null);
  
  useEffect(() => {
    screenplayRef.current = screenplay;
    saveState('cinematic_screenplay', screenplay);
  }, [screenplay]);

  useEffect(() => {
    saveState('cinematic_step', step);
  }, [step]);

  useEffect(() => {
    saveState('cinematic_idea', idea);
  }, [idea]);

  useEffect(() => {
    saveState('cinematic_suggestions', suggestions);
  }, [suggestions]);

  useEffect(() => {
    saveState('cinematic_numEpisodes', numEpisodes);
  }, [numEpisodes]);

  useEffect(() => {
    saveState('cinematic_durationPerEpisode', durationPerEpisode);
  }, [durationPerEpisode]);
  
  // Step 3: Breakdown
  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(() => loadState('cinematic_activeEpisodeId', null));

  useEffect(() => {
    saveState('cinematic_activeEpisodeId', activeEpisodeId);
  }, [activeEpisodeId]);
  
  // Step 4: Final Prompts
  const [copied, setCopied] = useState<string | null>(null);

  const handleSuggestIdeas = async () => {
    setLoading(true);
    try {
      const res = await suggestIdeas(mode);
      setSuggestions(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScreenplay = async () => {
    if (!idea) return;
    setLoading(true);
    try {
      const res = await generateScreenplay(idea, numEpisodes, durationPerEpisode, mode);
      setScreenplay({
        ...res,
        intensityLevel: 'action-drama' // Default
      });
      setStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBreakdown = async (episodeId: number) => {
    if (!screenplay) return;
    const ep = screenplay.episodes.find(e => e.id === episodeId);
    if (!ep) return;
    
    // Get context from previous episode
    const prevEp = screenplay.episodes.find(e => e.id === episodeId - 1);
    const previousContext = prevEp ? prevEp.summary : "Đây là tập đầu tiên.";

    setLoading(true);
    setActiveEpisodeId(episodeId);
    try {
      const numScenes = Math.ceil((ep.duration * 60) / 12);
      const scenes = await breakdownScenes(ep.summary, numScenes, previousContext, screenplay.intensityLevel, mode);
      
      // Automatically detect characters for each scene
      const scenesWithCharacters = scenes.map(s => ({
        ...s,
        characters: detectCharacters(s.description)
      }));
      
      const updatedEpisodes = screenplay.episodes.map(e => 
        e.id === episodeId ? { ...e, scenes: scenesWithCharacters } : e
      );
      setScreenplay({ ...screenplay, episodes: updatedEpisodes });
      setStep(3);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    if (!screenplay || activeEpisodeId === null) return;
    const ep = screenplay.episodes.find(e => e.id === activeEpisodeId);
    if (!ep) return;

    // Generate prompts for all scenes that don't have one yet or just all of them
    const scenesToProcess = ep.scenes;
    
    setLoading(true);
    try {
      for (const scene of scenesToProcess) {
        // Skip if already generating
        if (scene.loading) continue;
        
        await handleGeneratePrompt(activeEpisodeId, scene.id);
        // Small delay to prevent API rate limiting and allow state to settle
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = () => {
    if (!screenplay) return;
    
    let content = `KỊCH BẢN TỔNG THỂ: ${screenplay.overallPlot}\n\n`;
    
    screenplay.episodes.forEach(ep => {
      const hasPrompts = ep.scenes.some(s => s.finalPrompt);
      if (!hasPrompts) return;

      content += `========================================\n`;
      content += `TẬP ${ep.id}: ${ep.title}\n`;
      content += `TÓM TẮT: ${ep.summary}\n`;
      content += `========================================\n\n`;
      
      ep.scenes.forEach((scene, idx) => {
        if (scene.finalPrompt) {
          content += `CẢNH ${idx + 1}:\n`;
          content += `MÔ TẢ: ${scene.description}\n\n`;
          content += `PROMPT (EN):\n${scene.finalPrompt.prompt}\n\n`;
          content += `DỊCH (VI):\n${scene.finalPrompt.translation}\n\n`;
          content += `PROMPT (ZH):\n${scene.finalPrompt.chinesePrompt}\n\n`;
          content += `----------------------------------------\n\n`;
        }
      });
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prompts_Couple_Comedy_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updateOverallPlot = (value: string) => {
    if (!screenplay) return;
    setScreenplay({ ...screenplay, overallPlot: value });
  };

  const updateIntensityLevel = (level: 'storytelling' | 'action-drama' | 'hardcore') => {
    if (!screenplay) return;
    setScreenplay({ ...screenplay, intensityLevel: level });
  };

  const updateEpisode = (id: number, field: 'title' | 'summary' | 'duration', value: any) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(ep => 
      ep.id === id ? { ...ep, [field]: value } : ep
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const toggleCharacterCameoOutfit = (episodeId: number, sceneId: string, characterId: string) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(e => 
      e.id === episodeId ? {
        ...e,
        scenes: e.scenes.map(s => s.id === sceneId ? { 
          ...s, 
          characters: s.characters?.map(c => c.id === characterId ? { ...c, useCameoOutfit: !c.useCameoOutfit } : c)
        } : s)
      } : e
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const toggleCharacterGender = (episodeId: number, sceneId: string, characterId: string) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(e => 
      e.id === episodeId ? {
        ...e,
        scenes: e.scenes.map(s => s.id === sceneId ? { 
          ...s, 
          characters: s.characters?.map(c => c.id === characterId ? { ...c, gender: c.gender === 'male' ? 'female' : 'male' } : c)
        } : s)
      } : e
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const handleGeneratePrompt = async (episodeId: number, sceneId: string) => {
    const currentScreenplay = screenplayRef.current;
    if (!currentScreenplay) return;
    const ep = currentScreenplay.episodes.find(e => e.id === episodeId);
    if (!ep) return;
    const scene = ep.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Set loading state for specific scene
    const updateSceneLoading = (isLoading: boolean) => {
      setScreenplay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          episodes: prev.episodes.map(e => 
            e.id === episodeId ? {
              ...e,
              scenes: e.scenes.map(s => s.id === sceneId ? { ...s, loading: isLoading, progress: isLoading ? 0 : 100 } : s)
            } : e
          )
        };
      });
    };

    updateSceneLoading(true);

    // Simulated progress timer
    const progressInterval = setInterval(() => {
      setScreenplay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          episodes: prev.episodes.map(e => 
            e.id === episodeId ? {
              ...e,
              scenes: e.scenes.map(s => {
                if (s.id === sceneId && s.loading) {
                  // Increment progress slowly up to 99%
                  const currentProgress = s.progress || 0;
                  const increment = currentProgress < 30 ? 5 : currentProgress < 70 ? 2 : currentProgress < 95 ? 1 : 0.2;
                  const nextProgress = Math.min(99, currentProgress + increment);
                  return { ...s, progress: nextProgress };
                }
                return s;
              })
            } : e
          )
        };
      });
    }, 200);

    try {
      // Find previous scene for continuity
      const latestScreenplay = screenplayRef.current;
      if (!latestScreenplay) return;
      
      const currentEpisode = latestScreenplay.episodes.find(e => e.id === episodeId);
      let previousSceneDesc = undefined;
      let previousTechnicalPrompt = undefined;
      let isLateScene = false;
      
      if (currentEpisode) {
        const sceneIndex = currentEpisode.scenes.findIndex(s => s.id === sceneId);
        isLateScene = sceneIndex >= Math.floor(currentEpisode.scenes.length / 2);
        
        if (sceneIndex > 0) {
          const prevScene = currentEpisode.scenes[sceneIndex - 1];
          previousSceneDesc = prevScene.description;
          previousTechnicalPrompt = prevScene.finalPrompt?.prompt;
        } else {
          // If first scene of episode, check last scene of previous episode
          const prevEp = latestScreenplay.episodes.find(e => e.id === episodeId - 1);
          if (prevEp && prevEp.scenes.length > 0) {
            const lastScene = prevEp.scenes[prevEp.scenes.length - 1];
            previousSceneDesc = lastScene.description;
            previousTechnicalPrompt = lastScene.finalPrompt?.prompt;
          }
        }
      }

      // Layer 1: Global Story (Overall Plot + Summaries up to current episode)
      const episodeHistory = latestScreenplay.episodes
        .filter(e => e.id <= episodeId)
        .map(e => `Tập ${e.id}: ${e.summary}`)
        .join('\n');
      
      const globalStory = `KỊCH BẢN TỔNG THỂ: ${latestScreenplay.overallPlot}\n\nDIỄN BIẾN ĐẾN HIỆN TẠI:\n${episodeHistory}`;

      const res = await generateFinalPrompt(
        scene.description, 
        globalStory, 
        scene.characters || [], 
        latestScreenplay.intensityLevel,
        previousSceneDesc,
        previousTechnicalPrompt,
        isLateScene,
        mode
      );
      
      clearInterval(progressInterval);

      setScreenplay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          episodes: prev.episodes.map(e => 
            e.id === episodeId ? {
              ...e,
              scenes: e.scenes.map(s => s.id === sceneId ? { ...s, finalPrompt: res, loading: false, progress: 100 } : s)
            } : e
          )
        };
      });
    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      updateSceneLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const reset = () => {
    setStep(1);
    setIdea('');
    setSuggestions([]);
    setScreenplay(null);
    setActiveEpisodeId(null);
  };

  const handleAddScene = (index?: number) => {
    if (!screenplay || activeEpisodeId === null) return;
    const newScene = {
      id: "scene-" + Date.now(),
      description: "",
      characters: [],
      loading: false,
      progress: 0
    };

    const updatedEpisodes = screenplay.episodes.map(ep => {
      if (ep.id === activeEpisodeId) {
        const newScenes = [...ep.scenes];
        if (typeof index === 'number') {
          newScenes.splice(index + 1, 0, newScene);
        } else {
          newScenes.push(newScene);
        }
        return { ...ep, scenes: newScenes };
      }
      return ep;
    });
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-16 max-w-3xl mx-auto">
        {[
          { n: 1, label: 'Ý tưởng', icon: Lightbulb },
          { n: 2, label: 'Kịch bản', icon: Clapperboard },
          { n: 3, label: 'Chia cảnh', icon: Scissors },
          { n: 4, label: 'Xuất Prompt', icon: Send }
        ].map((s) => (
          <div key={s.n} className="flex flex-col items-center relative flex-1">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
              step >= s.n ? "bg-soft-rose border-none text-white shadow-[0_0_20px_rgba(255,128,171,0.3)]" : "bg-white border-none text-soft-rose/20"
            )}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em] mt-4",
              step >= s.n ? "text-soft-rose" : "text-soft-rose/20"
            )}>{s.label}</span>
            {s.n < 4 && (
              <div className={cn(
                "absolute top-6 left-[50%] w-full h-[1px] -z-0",
                step > s.n ? "bg-soft-rose/50" : "bg-pastel-pink-dark/20"
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: IDEA GENERATOR */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="luxury-card relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 lg:mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 lg:p-4 bg-soft-rose/10 rounded-2xl">
                    <Lightbulb className="w-5 h-5 lg:w-6 lg:h-6 text-soft-rose" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-serif text-slate-800 font-bold tracking-tight">Khởi tạo ý tưởng</h2>
                    <p className="text-soft-rose/40 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em]">Bước 1: Khởi tạo Ý tưởng {mode === 'dialogue' ? '(Có Thoại)' : '(Không Thoại)'}</p>
                  </div>
                </div>
                {screenplay && (
                  <button onClick={() => setStep(2)} className="p-2 lg:p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors self-end sm:self-auto">
                    <ArrowRight className="w-5 h-5 text-soft-rose" />
                  </button>
                )}
              </div>

              <div className="space-y-6 lg:space-y-8">
                <div>
                  <label className="luxury-label">
                    Nhập ý tưởng sơ khai của bạn
                  </label>
                  <textarea 
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Ví dụ: Chồng lén lút giấu quỹ đen trong lọ hoa và bị vợ bắt quả tang..."
                    rows={4}
                    className="input-field resize-none mb-6 lg:mb-8"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="luxury-label">Số tập phim</label>
                      <div className="flex items-center bg-white rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-soft-rose/40 transition-all h-[48px] lg:h-[52px] px-4">
                        <input 
                          type="number"
                          value={numEpisodes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') setNumEpisodes(0);
                            else setNumEpisodes(parseInt(val) || 0);
                          }}
                          onBlur={() => {
                            if (!numEpisodes || numEpisodes < 1) setNumEpisodes(1);
                          }}
                          className="flex-1 bg-transparent border-none text-left focus:ring-0 p-0 text-slate-800 font-bold text-sm min-w-0"
                        />
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={() => setNumEpisodes(Math.max(1, numEpisodes - 1))}
                            className="p-1.5 lg:p-2 bg-soft-rose/5 hover:bg-soft-rose/10 rounded-lg text-soft-rose/60 hover:text-soft-rose transition-all active:scale-90"
                            type="button"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setNumEpisodes(numEpisodes + 1)}
                            className="p-1.5 lg:p-2 bg-soft-rose/5 hover:bg-soft-rose/10 rounded-lg text-soft-rose/60 hover:text-soft-rose transition-all active:scale-90"
                            type="button"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="luxury-label">Phút mỗi tập</label>
                      <div className="flex items-center bg-white rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-soft-rose/40 transition-all h-[48px] lg:h-[52px] px-4">
                        <input 
                          type="number"
                          value={durationPerEpisode || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') setDurationPerEpisode(0);
                            else setDurationPerEpisode(parseInt(val) || 0);
                          }}
                          onBlur={() => {
                            if (!durationPerEpisode || durationPerEpisode < 1) setDurationPerEpisode(1);
                          }}
                          className="flex-1 bg-transparent border-none text-left focus:ring-0 p-0 text-slate-800 font-bold text-sm min-w-0"
                        />
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={() => setDurationPerEpisode(Math.max(1, durationPerEpisode - 1))}
                            className="p-1.5 lg:p-2 bg-soft-rose/5 hover:bg-soft-rose/10 rounded-lg text-soft-rose/60 hover:text-soft-rose transition-all active:scale-90"
                            type="button"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setDurationPerEpisode(durationPerEpisode + 1)}
                            className="p-1.5 lg:p-2 bg-soft-rose/5 hover:bg-soft-rose/10 rounded-lg text-soft-rose/60 hover:text-soft-rose transition-all active:scale-90"
                            type="button"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                  <button
                    onClick={handleSuggestIdeas}
                    disabled={loading}
                    className="btn-secondary flex-1 py-3"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ĐANG GỢI Ý...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>GỢI Ý Ý TƯỞNG</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateScreenplay}
                    disabled={loading || !idea}
                    className="btn-primary flex-1 py-3"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ĐANG TẠO...</span>
                      </>
                    ) : (
                      <>
                        <span>TIẾP THEO</span>
                        <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                <h3 className="luxury-label ml-1">Xu hướng hài hước hot</h3>
                {suggestions.map((s, i) => (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    onClick={() => setIdea(s.description)}
                    className="text-left p-6 bg-white rounded-2xl hover:bg-soft-rose/5 transition-all group"
                  >
                    <h4 className="font-serif text-lg text-slate-800 mb-2 group-hover:text-soft-rose transition-colors">{s.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed font-light">{s.description}</p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: SCREENPLAY */}
        {step === 2 && screenplay && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="luxury-card relative overflow-hidden">
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-soft-rose/10 rounded-2xl">
                    <Clapperboard className="w-6 h-6 text-soft-rose" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-slate-800 font-bold tracking-tight">Kịch bản phân tập</h2>
                    <p className="text-soft-rose/40 text-[10px] font-black uppercase tracking-[0.3em]">Bước 2: Soạn thảo Kịch bản</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-soft-rose" />
                  </button>
                  {screenplay.episodes.some(e => e.scenes.length > 0) && (
                    <button onClick={() => setStep(3)} className="p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors">
                      <ArrowRight className="w-5 h-5 text-soft-rose" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <label className="luxury-label">Cốt truyện tổng thể</label>
                  <textarea 
                    value={screenplay.overallPlot}
                    onChange={(e) => updateOverallPlot(e.target.value)}
                    rows={4}
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['storytelling', 'action-drama', 'hardcore'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateIntensityLevel(level)}
                      className={cn(
                        "p-6 rounded-2xl transition-all text-left group",
                        screenplay.intensityLevel === level 
                          ? "bg-soft-rose/10 shadow-[0_0_20px_rgba(255,128,171,0.1)]" 
                          : "bg-white hover:bg-soft-rose/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Zap className={cn(
                          "w-5 h-5",
                          screenplay.intensityLevel === level ? "text-soft-rose" : "text-soft-rose/20"
                        )} />
                        {screenplay.intensityLevel === level && (
                          <div className="w-2 h-2 rounded-full bg-soft-rose animate-pulse" />
                        )}
                      </div>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1",
                        screenplay.intensityLevel === level ? "text-soft-rose" : "text-slate-400"
                      )}>
                        {level === 'storytelling' ? 'Bình thường' : level === 'action-drama' ? 'Kịch tính' : 'Hardcore'}
                      </p>
                      <p className="text-xs text-slate-500 font-light leading-relaxed">
                        {level === 'storytelling' ? 'Tập trung vào đối thoại và cảm xúc.' : level === 'action-drama' ? 'Cân bằng giữa cốt truyện và hành động.' : 'Hành động dồn dập, nhịp độ cực nhanh.'}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  <label className="luxury-label">Danh sách tập phim</label>
                  <div className="grid grid-cols-1 gap-4">
                    {screenplay.episodes.map((ep) => (
                      <div key={ep.id} className="bg-white rounded-3xl p-8 transition-all group">
                        <div className="flex flex-col md:flex-row gap-8">
                          <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-4">
                              <span className="text-4xl font-serif font-bold text-soft-rose/20">0{ep.id}</span>
                              <input 
                                value={ep.title}
                                onChange={(e) => updateEpisode(ep.id, 'title', e.target.value)}
                                className="bg-transparent border-none text-xl font-serif font-bold text-slate-800 focus:ring-0 p-0 w-full"
                                placeholder="Tiêu đề tập..."
                              />
                            </div>
                            <textarea 
                              value={ep.summary}
                              onChange={(e) => updateEpisode(ep.id, 'summary', e.target.value)}
                              rows={3}
                              className="bg-transparent border-none text-sm text-slate-600 focus:ring-0 p-0 w-full resize-none font-bold leading-relaxed"
                              placeholder="Tóm tắt nội dung tập này..."
                            />
                          </div>
                          <div className="md:w-48 flex flex-col justify-between items-end">
                            <div className="flex items-center gap-2 bg-soft-rose/5 px-3 py-2 rounded-xl">
                              <Clock className="w-3 h-3 text-soft-rose" />
                              <input 
                                type="number"
                                value={ep.duration || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') updateEpisode(ep.id, 'duration', 0);
                                  else updateEpisode(ep.id, 'duration', parseInt(val) || 0);
                                }}
                                onBlur={() => {
                                  if (!ep.duration || ep.duration < 1) updateEpisode(ep.id, 'duration', 1);
                                }}
                                className="bg-transparent border-none text-xs font-black text-soft-rose focus:ring-0 p-0 w-6 text-left min-w-0"
                              />
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => updateEpisode(ep.id, 'duration', Math.max(1, ep.duration - 1))}
                                  className="p-1 hover:bg-soft-rose/10 rounded text-soft-rose/60 hover:text-soft-rose transition-all active:scale-90"
                                  type="button"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <button 
                                  onClick={() => updateEpisode(ep.id, 'duration', ep.duration + 1)}
                                  className="p-1 hover:bg-soft-rose/10 rounded text-soft-rose/60 hover:text-soft-rose transition-all active:scale-90"
                                  type="button"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <span className="text-[10px] font-black text-soft-rose/60 uppercase tracking-widest">Phút</span>
                            </div>
                            <button 
                              onClick={() => handleBreakdown(ep.id)}
                              disabled={loading}
                              className="btn-primary w-full py-4"
                            >
                              {loading && activeEpisodeId === ep.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>ĐANG CHIA CẢNH...</span>
                                </>
                              ) : (
                                <>
                                  <Scissors className="w-4 h-4" />
                                  <span>CHIA CẢNH</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: SCENE BREAKDOWN */}
        {step === 3 && screenplay && activeEpisodeId !== null && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="luxury-card relative overflow-hidden">
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-soft-rose/10 rounded-2xl">
                    <Scissors className="w-6 h-6 text-soft-rose" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-slate-800 font-bold tracking-tight">Chia cảnh chi tiết</h2>
                    <p className="text-soft-rose/40 text-[10px] font-black uppercase tracking-[0.3em]">Bước 3: Phân cảnh Chi tiết — Tập {activeEpisodeId}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-soft-rose" />
                  </button>
                  {screenplay.episodes.some(e => e.scenes.some(s => s.finalPrompt)) && (
                    <button onClick={() => setStep(4)} className="p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors">
                      <ArrowRight className="w-5 h-5 text-soft-rose" />
                    </button>
                  )}
                  <button 
                    onClick={handleExportAll}
                    disabled={loading}
                    className="btn-secondary px-6"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    TẠO TẤT CẢ
                  </button>
                  <button onClick={() => setStep(4)} className="btn-primary px-6">
                    XEM TỔNG HỢP
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                {screenplay.episodes.find(e => e.id === activeEpisodeId)?.scenes.map((scene, idx) => (
                  <div key={scene.id} className="border-b border-soft-rose/10 py-8 lg:py-12 group transition-all last:border-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 lg:mb-10">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 lg:w-10 lg:h-10 bg-soft-rose text-white rounded-full flex items-center justify-center text-[10px] lg:text-xs font-black shadow-[0_0_15px_rgba(255,128,171,0.4)]">
                          {idx + 1}
                        </span>
                        <h3 className="text-base lg:text-lg font-serif font-bold text-slate-800 tracking-tight">Cảnh quay chi tiết</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 lg:gap-6 self-end sm:self-auto">
                        <div className="flex flex-wrap gap-2 lg:gap-3 items-center">
                          <span className="text-[8px] lg:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Nhân vật:</span>
                          {scene.characters && scene.characters.length > 0 ? (
                            scene.characters.map(char => (
                              <div 
                                key={char.id} 
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2 rounded-2xl transition-all relative overflow-hidden",
                                  char.useCameoOutfit 
                                    ? "bg-soft-rose/10" 
                                    : "bg-slate-50 opacity-80"
                                )}
                              >
                                {char.isMain && (
                                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-soft-rose text-[6px] font-black text-white rounded-bl-lg uppercase tracking-widest">
                                    Main
                                  </div>
                                )}
                                <div className={cn("w-2 h-2 rounded-full shrink-0", char.color)} />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-800 whitespace-nowrap">{char.name}</span>
                                  <span className={cn(
                                    "text-[7px] font-black uppercase tracking-widest",
                                    char.useCameoOutfit ? "text-soft-rose" : "text-slate-400"
                                  )}>
                                    {char.isMain ? 'Nhân vật chính' : 'Nhân vật phụ'}
                                  </span>
                                </div>
                                <div className="w-px h-4 bg-pastel-pink-dark mx-1 shrink-0" />
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => toggleCharacterGender(activeEpisodeId, scene.id, char.id)}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                      char.gender === 'male' 
                                        ? "bg-blue-500/10 text-blue-600" 
                                        : "bg-rose-500/10 text-rose-600"
                                    )}
                                  >
                                    {char.gender === 'male' ? 'NAM' : 'NỮ'}
                                  </button>
                                  <button 
                                    onClick={() => toggleCharacterCameoOutfit(activeEpisodeId, scene.id, char.id)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                      char.useCameoOutfit 
                                        ? "bg-soft-rose text-white shadow-[0_0_10px_rgba(255,128,171,0.4)]" 
                                        : "bg-slate-100 text-slate-500"
                                    )}
                                  >
                                    {char.useCameoOutfit ? (
                                      <>
                                        <ZapIcon className="w-2.5 h-2.5 fill-current" />
                                        CAMEO
                                      </>
                                    ) : (
                                      <>
                                        <Shirt className="w-2.5 h-2.5" />
                                        FREE
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <button 
                              onClick={() => {
                                const detected = detectCharacters(scene.description);
                                if (detected.length > 0) {
                                  const updatedEpisodes = screenplay.episodes.map(ep => 
                                    ep.id === activeEpisodeId ? {
                                      ...ep,
                                      scenes: ep.scenes.map(s => s.id === scene.id ? { ...s, characters: detected } : s)
                                    } : ep
                                  );
                                  setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                                }
                              }}
                              className="text-[9px] font-black text-soft-rose uppercase tracking-widest hover:underline"
                            >
                              Quét nhân vật
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="p-3 hover:bg-soft-rose/10 rounded-xl text-slate-400 hover:text-soft-rose transition-all">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (!screenplay || activeEpisodeId === null) return;
                              const updatedEpisodes = screenplay.episodes.map(ep => 
                                ep.id === activeEpisodeId ? {
                                  ...ep,
                                  scenes: ep.scenes.filter(s => s.id !== scene.id)
                                } : ep
                              );
                              setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                            }}
                            className="p-3 hover:bg-soft-rose/10 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <label className="luxury-label">Mô tả hành động & bối cảnh</label>
                        <textarea 
                          value={scene.description}
                          onChange={(e) => {
                            const newDesc = e.target.value;
                            const updatedEpisodes = screenplay.episodes.map(ep => 
                              ep.id === activeEpisodeId ? {
                                ...ep,
                                scenes: ep.scenes.map(s => {
                                  if (s.id === scene.id) {
                                    const detected = detectCharacters(newDesc, s.characters);
                                    return { ...s, description: newDesc, characters: detected };
                                  }
                                  return s;
                                })
                              } : ep
                            );
                            setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                          }}
                          className="input-field h-[200px] resize-none font-light leading-relaxed"
                        />
                        <button 
                          onClick={() => handleGeneratePrompt(activeEpisodeId, scene.id)}
                          disabled={scene.loading}
                          className="w-full py-5 text-sm bg-soft-rose hover:bg-soft-rose/90 disabled:bg-soft-rose/20 text-white font-black uppercase tracking-[0.3em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-soft-rose/20"
                        >
                          {scene.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          TẠO PROMPT V2 (NEW)
                        </button>

                        <button 
                          onClick={() => handleAddScene(idx)}
                          className="w-full py-4 mt-4 rounded-2xl flex items-center justify-center gap-2 text-soft-rose/40 hover:text-soft-rose transition-all bg-soft-rose/5 group"
                        >
                          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Thêm cảnh quay mới</span>
                        </button>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <label className="luxury-label">Kết quả Prompt (AI Video)</label>
                          {scene.finalPrompt && (
                            <button 
                              onClick={() => copyToClipboard(scene.finalPrompt!.chinesePrompt, scene.id)}
                              className="flex items-center gap-2 text-[10px] font-bold text-soft-rose uppercase tracking-widest hover:text-soft-rose-dark transition-colors"
                            >
                              {copied === scene.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied === scene.id ? 'ĐÃ COPY' : 'COPY PROMPT'}
                            </button>
                          )}
                        </div>
                        
                        <div className="bg-slate-50 rounded-3xl p-8 h-[400px] overflow-y-auto relative custom-scrollbar">
                          {!scene.finalPrompt && !scene.loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-soft-rose/10">
                              <Sparkle className="w-12 h-12 mb-4 opacity-30" />
                              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Chưa có prompt</span>
                            </div>
                          )}
                          {scene.loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md z-10 overflow-hidden rounded-3xl">
                              <div className="relative z-20 flex flex-col items-center w-full px-12">
                                <div className="relative mb-8">
                                  <Loader2 className="w-16 h-16 animate-spin text-soft-rose opacity-20" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-black text-soft-rose">
                                      {Math.round(scene.progress || 0)}%
                                    </span>
                                  </div>
                                </div>
                                
                                <h3 className="text-xs font-black text-soft-rose uppercase tracking-[0.4em] mb-6 text-center leading-loose">
                                  ĐANG VIẾT CÂU LỆNH<br/>
                                  <span className="text-[10px] text-slate-400">VUI LÒNG ĐỢI TRONG GIÂY LÁT...</span>
                                </h3>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-gradient-to-r from-soft-rose/40 via-soft-rose to-soft-rose/40"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${scene.progress || 0}%` }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                                
                                <div className="mt-4 flex justify-between w-full text-[8px] font-black text-soft-rose/40 uppercase tracking-widest">
                                  <span>KHỞI TẠO CẤU TRÚC</span>
                                  <span>HOÀN THÀNH</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {scene.finalPrompt && (
                            <div className="space-y-8">
                              <div className="bg-soft-rose/5 p-6 rounded-2xl">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-[9px] font-black text-soft-rose uppercase tracking-widest block">PROMPT (TIẾNG ANH)</span>
                                  <button 
                                    onClick={() => copyToClipboard(scene.finalPrompt!.prompt, scene.id)}
                                    className="text-soft-rose/60 hover:text-soft-rose transition-colors"
                                  >
                                    {copied === scene.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <p className="text-xs font-mono font-bold text-soft-rose leading-relaxed mb-4">
                                  {scene.finalPrompt.prompt}
                                </p>
                                <div className="h-px bg-soft-rose/10 mb-4" />
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[9px] font-black text-soft-rose/60 uppercase tracking-widest block">Bản dịch Tiếng Việt</span>
                                  <button 
                                    onClick={() => copyToClipboard(scene.finalPrompt!.translation, scene.id + '-vi')}
                                    className="text-soft-rose/40 hover:text-soft-rose transition-colors"
                                  >
                                    {copied === scene.id + '-vi' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed italic font-bold mb-4">
                                  {scene.finalPrompt.translation}
                                </p>
                                <div className="h-px bg-soft-rose/10 mb-4" />
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[9px] font-black text-soft-rose/60 uppercase tracking-widest block">Bản dịch Tiếng Trung (AI Video)</span>
                                  <button 
                                    onClick={() => copyToClipboard(scene.finalPrompt!.chinesePrompt, scene.id + '-zh')}
                                    className="text-soft-rose/40 hover:text-soft-rose transition-colors"
                                  >
                                    {copied === scene.id + '-zh' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-xs text-slate-800 leading-relaxed font-bold">
                                  {scene.finalPrompt.chinesePrompt}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => handleAddScene()}
                  className="w-full rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-soft-rose/40 hover:text-soft-rose transition-all bg-soft-rose/5"
                >
                  <Plus className="w-10 h-10 mb-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Thêm cảnh quay mới</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: FINAL PROMPT OUTPUT */}
        {step === 4 && screenplay && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="luxury-card relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 lg:mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-3 lg:p-4 bg-soft-rose/10 rounded-2xl">
                    <Send className="w-5 h-5 lg:w-6 lg:h-6 text-soft-rose" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-serif text-slate-800 font-bold tracking-tight">Xuất Prompt Điện Ảnh</h2>
                    <p className="text-soft-rose/40 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em]">Bước 4: Kết quả Prompt Cuối cùng</p>
                  </div>
                </div>
                <div className="flex gap-2 lg:gap-3 self-end sm:self-auto">
                  <button 
                    onClick={handleDownloadAll}
                    className="p-2 lg:p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors flex items-center gap-2 text-soft-rose"
                    title="Tải xuống tất cả prompt"
                  >
                    <Download className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest">Tải xuống</span>
                  </button>
                  <button onClick={() => setStep(3)} className="p-2 lg:p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors">
                    <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 text-soft-rose" />
                  </button>
                  <button onClick={reset} className="p-2 lg:p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors">
                    <RotateCcw className="w-4 h-4 lg:w-5 lg:h-5 text-soft-rose" />
                  </button>
                </div>
              </div>

              <div className="space-y-10 lg:space-y-16">
                {screenplay.episodes.map((ep) => (
                   ep.scenes.some(s => s.finalPrompt) && (
                    <div key={ep.id} className="space-y-6 lg:space-y-10">
                      <div className="flex items-center gap-3 lg:gap-6">
                        <div className="h-px bg-pastel-pink-dark flex-1" />
                        <h3 className="text-[9px] lg:text-[11px] font-black text-soft-rose uppercase tracking-[0.2em] lg:tracking-[0.4em] text-center">Tập {ep.id}: {ep.title}</h3>
                        <div className="h-px bg-pastel-pink-dark flex-1" />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 lg:gap-10">
                        {ep.scenes.map((scene, idx) => (
                          scene.finalPrompt && (
                            <div key={scene.id} className="space-y-4 lg:space-y-6">
                              {/* V2 Output Card */}
                              <div className="border-b border-soft-rose/10 py-6 lg:py-10 group transition-all last:border-0">
                                <div className="px-5 lg:px-10 py-3 lg:py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[8px] lg:text-[10px] font-black text-soft-rose uppercase tracking-[0.2em] lg:tracking-[0.3em]">Cảnh {idx + 1} — PROMPT (TIẾNG ANH)</span>
                                  </div>
                                  <button 
                                    onClick={() => copyToClipboard(scene.finalPrompt!.prompt, scene.id + '-final')}
                                    className="text-soft-rose/60 hover:text-soft-rose transition-colors flex items-center gap-2 text-[8px] lg:text-[10px] font-black uppercase tracking-widest"
                                  >
                                    {copied === scene.id + '-final' ? (
                                      <>
                                        <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                        <span>ĐÃ SAO CHÉP</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                        <span>SAO CHÉP PROMPT</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-5 lg:p-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                                  <div>
                                    <label className="luxury-label mb-2 lg:mb-4 block text-soft-rose/60">Prompt Tiếng Anh</label>
                                    <pre className="whitespace-pre-wrap font-mono text-[10px] lg:text-xs font-bold text-soft-rose leading-relaxed bg-white p-4 lg:p-8 rounded-[1rem] lg:rounded-[1.5rem] h-[180px] lg:h-[220px] overflow-y-auto custom-scrollbar">
                                      {scene.finalPrompt.prompt}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-center mb-2 lg:mb-4">
                                      <label className="luxury-label block text-soft-rose/60 mb-0">Bản dịch Tiếng Việt</label>
                                      <button 
                                        onClick={() => copyToClipboard(scene.finalPrompt!.translation, scene.id + '-final-vi')}
                                        className="text-soft-rose/40 hover:text-soft-rose transition-colors"
                                      >
                                        {copied === scene.id + '-final-vi' ? <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> : <Copy className="w-3 h-3 lg:w-3.5 lg:h-3.5" />}
                                      </button>
                                    </div>
                                    <div className="text-xs lg:text-sm text-slate-600 leading-relaxed bg-white p-4 lg:p-8 rounded-[1rem] lg:rounded-[1.5rem] h-[180px] lg:h-[220px] overflow-y-auto custom-scrollbar font-bold italic">
                                      {scene.finalPrompt.translation}
                                    </div>
                                  </div>
                                  <div className="lg:col-span-2">
                                    <div className="flex justify-between items-center mb-2 lg:mb-4">
                                      <label className="luxury-label block text-soft-rose/60 mb-0">Bản dịch Tiếng Trung (AI Video)</label>
                                      <button 
                                        onClick={() => copyToClipboard(scene.finalPrompt!.chinesePrompt, scene.id + '-final-zh')}
                                        className="text-soft-rose/40 hover:text-soft-rose transition-colors"
                                      >
                                        {copied === scene.id + '-final-zh' ? <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> : <Copy className="w-3 h-3 lg:w-3.5 lg:h-3.5" />}
                                      </button>
                                    </div>
                                    <div className="text-xs lg:text-sm text-slate-800 leading-relaxed bg-white p-4 lg:p-8 rounded-[1rem] lg:rounded-[1.5rem] h-[120px] lg:h-[150px] overflow-y-auto custom-scrollbar font-bold">
                                      {scene.finalPrompt.chinesePrompt}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicPromptModule;
