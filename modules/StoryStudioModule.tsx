
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  Clock, 
  History, 
  Send, 
  ArrowLeft, 
  ArrowRight,
  Zap, 
  Copy, 
  Check,
  RotateCcw,
  Plus,
  Minus,
  Film,
  Scissors,
  Edit3,
  Save,
  Trash2,
  Download
} from 'lucide-react';
import { suggestStoryIdea, developStoryScript, generateStoryPrompt } from '../services/promptService';
import { Scene, Character, StoryTheme, StoryScript, CinematicPrompt } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { loadState, saveState } from '../services/persistenceService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const THEMES: { id: StoryTheme; label: string; icon: string }[] = [
  { id: 'ceo-reveal', label: 'Chồng giấu quỹ đen', icon: '💰' },
  { id: 'inspirational', label: 'Vợ chồng đồng lòng', icon: '🤝' },
  { id: 'emotional-family', label: 'Tình cảm vợ chồng', icon: '❤️' },
  { id: 'comedy', label: 'Hài hước vợ chồng', icon: '😂' },
  { id: 'culinary', label: 'Vợ nấu cơm chồng rửa bát', icon: '🍳' },
  { id: 'horror', label: 'Vợ là sư tử hà đông', icon: '🦁' },
  { id: 'historical', label: 'Vợ chồng xuyên không', icon: '🎎' },
];

const CHARACTER_COLORS = [
  'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500', 'bg-rose-400', 'bg-pink-400', 'bg-fuchsia-400', 'bg-purple-400'
];

const MAIN_CHARACTER_NAMES = [
  'hùng', 'lan', 'vợ', 'chồng', 'mẹ vợ', 'bố vợ', 'mẹ chồng', 'bố chồng', 'hàng xóm'
];

const detectCharacters = (text: string, existingCharacters: Character[] = []): Character[] => {
  const characters: Character[] = [...existingCharacters];
  const lowerText = text.toLowerCase();
  
  const regex = /(?:@(\d+)\s*\(([^)]+)\)|\[([^\]]+)\])/g;
  let match;
  let idCounter = characters.length + 1;
  
  while ((match = regex.exec(text)) !== null) {
    const id = match[1] || String(idCounter++);
    const name = (match[2] || match[3]).trim();
    
    const existing = characters.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      addCharacter(name, id, characters);
    }
  }

  MAIN_CHARACTER_NAMES.forEach(mainName => {
    if (lowerText.includes(mainName)) {
      if (!characters.find(c => c.name.toLowerCase().includes(mainName))) {
        addCharacter(mainName, String(idCounter++), characters);
      }
    }
  });
  
  return characters;
};

const addCharacter = (name: string, id: string, characters: Character[]) => {
  const lowerName = name.toLowerCase();
  let gender: 'male' | 'female' = 'male';
  const femaleMarkers = ['vợ', 'lan', 'mai', 'hồng', 'tuyết', 'ngọc', 'linh', 'trang', 'thảo', 'phương', 'hạnh', 'hiền', 'anh', 'nhi', 'vy', 'quỳnh', 'ngân', 'thơm', 'mẹ'];
  const maleMarkers = ['chồng', 'hùng', 'văn', 'tuấn', 'dũng', 'cường', 'minh', 'nam', 'sơn', 'hải', 'long', 'thành', 'trung', 'kiên', 'hoàng', 'huy', 'đức', 'việt', 'bố'];

  if (femaleMarkers.some(m => lowerName.includes(m)) && !maleMarkers.some(m => lowerName.includes(m))) gender = 'female';
  
  const isMain = MAIN_CHARACTER_NAMES.some(mainName => lowerName.includes(mainName));
  
  characters.push({
    id,
    name,
    gender,
    isMain,
    useCameoOutfit: true,
    color: CHARACTER_COLORS[characters.length % CHARACTER_COLORS.length]
  });
};

interface StoryStudioProps {
  mode: 'dialogue' | 'no-dialogue';
}

const StoryStudioModule: React.FC<StoryStudioProps> = ({ mode }) => {
  const [step, setStep] = useState(() => loadState('story_step', 1));
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<StoryTheme>(() => loadState('story_selectedTheme', 'ceo-reveal' as const));
  const [storyIdea, setStoryIdea] = useState(() => loadState('story_storyIdea', ''));
  const [numEpisodes, setNumEpisodes] = useState(() => loadState('story_numEpisodes', 1));
  const [durationPerEpisode, setDurationPerEpisode] = useState(() => loadState('story_durationPerEpisode', 1));
  const [script, setScript] = useState<StoryScript | null>(() => loadState('story_script', null));
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    saveState('story_step', step);
  }, [step]);

  useEffect(() => {
    saveState('story_selectedTheme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    saveState('story_storyIdea', storyIdea);
  }, [storyIdea]);

  useEffect(() => {
    saveState('story_numEpisodes', numEpisodes);
  }, [numEpisodes]);

  useEffect(() => {
    saveState('story_durationPerEpisode', durationPerEpisode);
  }, [durationPerEpisode]);

  useEffect(() => {
    saveState('story_script', script);
  }, [script]);

  const handleSuggestIdea = async () => {
    setLoading(true);
    try {
      const idea = await suggestStoryIdea(selectedTheme, mode);
      setStoryIdea(idea);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDevelopScript = async () => {
    if (!storyIdea) return;
    setLoading(true);
    try {
      const res = await developStoryScript(selectedTheme, storyIdea, numEpisodes, durationPerEpisode, mode);
      
      // Auto detect characters for all scenes
      const episodesWithChars = res.episodes.map(ep => ({
        ...ep,
        scenes: ep.scenes.map((s, idx) => ({
          ...s,
          id: `story-scene-${Date.now()}-${ep.id}-${idx}`,
          characters: detectCharacters(s.description),
          loading: false,
          progress: 0
        }))
      }));

      setScript({ ...res, episodes: episodesWithChars });
      setStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompt = async (episodeId: number, sceneId: string) => {
    if (!script) return;
    const episode = script.episodes.find(e => e.id === episodeId);
    if (!episode) return;
    const scene = episode.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const updateScene = (updates: Partial<Scene>) => {
      setScript(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          episodes: prev.episodes.map(e => e.id === episodeId ? {
            ...e,
            scenes: e.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s)
          } : e)
        };
      });
    };

    updateScene({ loading: true, progress: 0 });

    try {
      const sceneIndex = episode.scenes.findIndex(s => s.id === sceneId);
      const isLastScene = episodeId === script.episodes.length && sceneIndex === episode.scenes.length - 1;
      
      let previousSceneDesc = undefined;
      let previousTechnicalPrompt = undefined;
      
      if (sceneIndex > 0) {
        const prevScene = episode.scenes[sceneIndex - 1];
        previousSceneDesc = prevScene.description;
        previousTechnicalPrompt = prevScene.finalPrompt?.prompt;
      }

      const context = `${script.title}\n${script.summary}\n\nTẬP ${episodeId}: ${episode.title}\n${episode.summary}`;

      const res = await generateStoryPrompt(
        scene.description,
        context,
        scene.characters || [],
        selectedTheme,
        previousSceneDesc,
        previousTechnicalPrompt,
        isLastScene,
        mode
      );

      updateScene({ finalPrompt: res, loading: false, progress: 100 });
    } catch (error) {
      console.error(error);
      updateScene({ loading: false });
    }
  };

  const handleGenerateAll = async () => {
    if (!script) return;
    setLoading(true);
    try {
      for (const episode of script.episodes) {
        for (const scene of episode.scenes) {
          if (scene.finalPrompt) continue;
          await handleGeneratePrompt(episode.id, scene.id);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = () => {
    if (!script) return;
    
    let content = `PHIM: ${script.title}\n`;
    content += `TÓM TẮT TỔNG THỂ: ${script.summary}\n\n`;
    
    script.episodes.forEach(ep => {
      content += `========================================\n`;
      content += `TẬP ${ep.id}: ${ep.title}\n`;
      content += `TÓM TẮT TẬP: ${ep.summary}\n`;
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
    link.download = `Prompts_StoryStudio_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleCharacterCameo = (episodeId: number, sceneId: string, charId: string) => {
    setScript(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        episodes: prev.episodes.map(e => e.id === episodeId ? {
          ...e,
          scenes: e.scenes.map(s => s.id === sceneId ? {
            ...s,
            characters: s.characters?.map(c => c.id === charId ? { ...c, useCameoOutfit: !c.useCameoOutfit } : c)
          } : s)
        } : e)
      };
    });
  };

  const updateSceneDescription = (episodeId: number, sceneId: string, newDesc: string) => {
    setScript(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        episodes: prev.episodes.map(e => e.id === episodeId ? {
          ...e,
          scenes: e.scenes.map(s => s.id === sceneId ? { ...s, description: newDesc } : s)
        } : e)
      };
    });
  };

  const updateFinalPrompt = (episodeId: number, sceneId: string, field: keyof CinematicPrompt, value: string) => {
    setScript(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        episodes: prev.episodes.map(e => e.id === episodeId ? {
          ...e,
          scenes: e.scenes.map(s => s.id === sceneId && s.finalPrompt ? {
            ...s,
            finalPrompt: { ...s.finalPrompt, [field]: value }
          } : s)
        } : e)
      };
    });
  };

  const addSceneBetween = (episodeId: number, index: number) => {
    setScript(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        episodes: prev.episodes.map(e => {
          if (e.id !== episodeId) return e;
          const newScenes = [...e.scenes];
          const newScene: Scene = {
            id: `story-scene-${Date.now()}-added-${index}`,
            description: 'Mô tả cảnh mới tại đây...',
            characters: [],
            loading: false,
            progress: 0
          };
          newScenes.splice(index + 1, 0, newScene);
          return { ...e, scenes: newScenes };
        })
      };
    });
  };

  const deleteScene = (episodeId: number, sceneId: string) => {
    setScript(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        episodes: prev.episodes.map(e => {
          if (e.id !== episodeId) return e;
          return {
            ...e,
            scenes: e.scenes.filter(s => s.id !== sceneId)
          };
        })
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
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
                    <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-soft-rose" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-serif text-slate-800 font-bold tracking-tight">Xưởng Truyện</h2>
                    <p className="text-soft-rose/40 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em]">Kể chuyện Hài Hước Vợ Chồng</p>
                  </div>
                </div>
                {script && (
                  <button onClick={() => setStep(2)} className="p-2 lg:p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors self-end sm:self-auto">
                    <ArrowRight className="w-5 h-5 text-soft-rose" />
                  </button>
                )}
              </div>

              <div className="space-y-8 lg:space-y-10">
                {/* Theme Selection */}
                <div>
                  <label className="luxury-label mb-4 block">Chọn chủ đề phim</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {THEMES.map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme.id)}
                          className={cn(
                            "p-3 lg:p-4 rounded-2xl transition-all flex flex-col items-center gap-2 text-center group",
                            selectedTheme === theme.id 
                              ? "bg-soft-rose/10 shadow-[0_0_20px_rgba(255,128,171,0.1)]" 
                              : "bg-white hover:border-soft-rose/50"
                          )}
                        >
                          <span className="text-xl lg:text-2xl group-hover:scale-110 transition-transform">{theme.icon}</span>
                          <span className={cn(
                            "text-[8px] lg:text-[10px] font-black uppercase tracking-wider",
                            selectedTheme === theme.id ? "text-soft-rose" : "text-soft-rose/40"
                          )}>{theme.label}</span>
                        </button>
                    ))}
                  </div>
                </div>

                {/* Idea Input */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                    <label className="luxury-label mb-0">Ý tưởng kịch bản</label>
                    <button 
                      onClick={handleSuggestIdea}
                      disabled={loading}
                      className="flex items-center gap-2 text-[10px] font-black text-soft-rose uppercase tracking-widest hover:text-rose-500 transition-colors"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>ĐANG GỢI Ý...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          <span>AI Gợi ý ý tưởng</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative group">
                    <textarea 
                      value={storyIdea}
                      onChange={(e) => setStoryIdea(e.target.value)}
                      placeholder="Dán ý tưởng của bạn hoặc nhấn nút Gợi ý để AI viết giúp..."
                      rows={6}
                      className="input-field resize-none custom-scrollbar pr-12"
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-4 h-4 text-soft-rose/40" />
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="luxury-label">Số tập</label>
                    <div className="flex items-center bg-white rounded-2xl overflow-hidden h-[48px] lg:h-[52px] px-4">
                      <input 
                        type="number"
                        value={numEpisodes}
                        onChange={(e) => setNumEpisodes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 bg-transparent border-none text-left focus:ring-0 p-0 text-slate-800 font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="luxury-label">Số phút mỗi tập</label>
                    <div className="flex items-center bg-white rounded-2xl overflow-hidden h-[48px] lg:h-[52px] px-4">
                      <input 
                        type="number"
                        value={durationPerEpisode}
                        onChange={(e) => setDurationPerEpisode(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 bg-transparent border-none text-left focus:ring-0 p-0 text-slate-800 font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDevelopScript}
                  disabled={loading || !storyIdea}
                  className="btn-primary w-full py-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>ĐANG PHÁT TRIỂN...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>PHÁT TRIỂN KỊCH BẢN TRỌN GÓI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && script && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="luxury-card">
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-soft-rose/10 rounded-2xl border border-soft-rose/20">
                    <Film className="w-6 h-6 text-soft-rose" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-slate-800 font-bold tracking-tight">{script.title}</h2>
                    <p className="text-soft-rose/40 text-[10px] font-black uppercase tracking-[0.3em]">
                      {THEMES.find(t => t.id === selectedTheme)?.label} • {script.episodes.length} Tập
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleDownloadAll}
                    className="p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors flex items-center gap-2 text-soft-rose"
                    title="Tải xuống tất cả prompt"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Tải xuống</span>
                  </button>
                  <button onClick={() => setStep(1)} className="p-3 hover:bg-soft-rose/10 rounded-2xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-soft-rose" />
                  </button>
                  <button onClick={handleGenerateAll} disabled={loading} className="btn-secondary px-6">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ĐANG TẠO...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>TẠO TẤT CẢ PROMPT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6 bg-soft-rose/5 rounded-2xl mb-10">
                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"{script.summary}"</p>
              </div>

              <div className="space-y-16">
                {script.episodes.map((episode) => (
                  <div key={episode.id} className="space-y-8">
                    <div className="flex items-center gap-4 pb-4">
                      <span className="text-soft-rose font-serif text-xl font-bold">Tập {episode.id}:</span>
                      <h3 className="text-xl text-slate-800 font-bold">{episode.title}</h3>
                    </div>
                    
                    <div className="grid gap-8">
                      {episode.scenes.map((scene, idx) => (
                        <React.Fragment key={scene.id}>
                          <div className="border-b border-soft-rose/10 py-6 lg:py-10 transition-all group/scene relative last:border-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 lg:w-8 lg:h-8 bg-soft-rose text-white rounded-full flex items-center justify-center text-[8px] lg:text-[10px] font-black">
                                  {idx + 1}
                                </span>
                                <h4 className="text-base lg:text-lg font-serif font-bold text-slate-800">Cảnh {idx + 1}</h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 lg:gap-3 self-end sm:self-auto">
                                <div className="flex flex-wrap gap-1.5 lg:gap-2">
                                  {scene.characters?.map(char => (
                                    <button
                                      key={char.id}
                                      onClick={() => toggleCharacterCameo(episode.id, scene.id, char.id)}
                                      className={cn(
                                        "px-2 lg:px-3 py-0.5 lg:py-1 rounded-full text-[7px] lg:text-[9px] font-black uppercase tracking-wider transition-all",
                                        char.useCameoOutfit 
                                          ? "bg-soft-rose text-white" 
                                          : "bg-white text-soft-rose/40"
                                      )}
                                    >
                                      {char.name} {char.useCameoOutfit ? '• CAMEO' : ''}
                                    </button>
                                  ))}
                                </div>
                                <button 
                                  onClick={() => deleteScene(episode.id, scene.id)}
                                  className="p-1.5 lg:p-2 hover:bg-rose-500/20 rounded-lg transition-colors group/del"
                                >
                                  <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-300 group-hover/del:text-rose-500" />
                                </button>
                              </div>
                            </div>

                          {/* Scene Description - Editable */}
                          <div className="mb-8 relative">
                            {editingSceneId === scene.id ? (
                              <div className="space-y-2">
                                <textarea 
                                  value={scene.description}
                                  onChange={(e) => updateSceneDescription(episode.id, scene.id, e.target.value)}
                                  className="input-field min-h-[100px] text-sm"
                                  autoFocus
                                />
                                <button 
                                  onClick={() => setEditingSceneId(null)}
                                  className="flex items-center gap-2 text-[10px] font-black text-soft-rose uppercase tracking-widest"
                                >
                                  <Save className="w-3 h-3" /> Lưu thay đổi
                                </button>
                              </div>
                            ) : (
                              <div className="group/edit relative">
                                <p className="text-sm text-slate-600 leading-relaxed pr-8">{scene.description}</p>
                                <button 
                                  onClick={() => setEditingSceneId(scene.id)}
                                  className="absolute top-0 right-0 p-2 opacity-0 group-hover/edit:opacity-100 transition-opacity hover:bg-soft-rose/10 rounded-lg"
                                >
                                  <Edit3 className="w-4 h-4 text-soft-rose" />
                                </button>
                              </div>
                            )}
                          </div>

                          {scene.finalPrompt ? (
                            <div className="space-y-4 animate-fadeIn">
                              <div className="py-4 lg:py-6 relative border-t border-soft-rose/5">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-[9px] font-black text-soft-rose uppercase tracking-[0.2em]">Prompt Video AI (Tiếng Anh)</span>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setEditingPromptId(editingPromptId === `${scene.id}-en` ? null : `${scene.id}-en`)}
                                      className="p-2 hover:bg-soft-rose/10 rounded-lg transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4 text-soft-rose/60" />
                                    </button>
                                    <button 
                                      onClick={() => copyToClipboard(scene.finalPrompt!.prompt, `en-${scene.id}`)}
                                      className="p-2 hover:bg-soft-rose/10 rounded-lg transition-colors"
                                    >
                                      {copied === `en-${scene.id}` ? <Check className="w-4 h-4 text-soft-rose" /> : <Copy className="w-4 h-4 text-soft-rose/60" />}
                                    </button>
                                  </div>
                                </div>
                                {editingPromptId === `${scene.id}-en` ? (
                                  <textarea 
                                    value={scene.finalPrompt.prompt}
                                    onChange={(e) => updateFinalPrompt(episode.id, scene.id, 'prompt', e.target.value)}
                                    className="w-full bg-transparent border-none text-xs text-slate-800 font-mono focus:ring-0 p-0 min-h-[80px]"
                                  />
                                ) : (
                                  <p className="text-xs text-slate-800 font-mono leading-relaxed">{scene.finalPrompt.prompt}</p>
                                )}
                              </div>

                              <div className="py-4 lg:py-6 relative border-t border-soft-rose/5">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Bản dịch Tiếng Việt</span>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setEditingPromptId(editingPromptId === `${scene.id}-vi` ? null : `${scene.id}-vi`)}
                                      className="p-2 hover:bg-soft-rose/10 rounded-lg transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <button 
                                      onClick={() => copyToClipboard(scene.finalPrompt!.translation, `vi-${scene.id}`)}
                                      className="p-2 hover:bg-soft-rose/10 rounded-lg transition-colors"
                                    >
                                      {copied === `vi-${scene.id}` ? <Check className="w-4 h-4 text-soft-rose" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                    </button>
                                  </div>
                                </div>
                                {editingPromptId === `${scene.id}-vi` ? (
                                  <textarea 
                                    value={scene.finalPrompt.translation}
                                    onChange={(e) => updateFinalPrompt(episode.id, scene.id, 'translation', e.target.value)}
                                    className="w-full bg-transparent border-none text-xs text-slate-500 focus:ring-0 p-0 min-h-[60px]"
                                  />
                                ) : (
                                  <p className="text-xs text-slate-500 leading-relaxed">{scene.finalPrompt.translation}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <button
                                onClick={() => handleGeneratePrompt(episode.id, scene.id)}
                                disabled={scene.loading}
                                className="w-full py-4 bg-soft-rose/5 hover:bg-soft-rose/10 rounded-2xl flex items-center justify-center gap-3 transition-all group"
                              >
                                {scene.loading ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-soft-rose" />
                                    <span className="text-[10px] font-black text-soft-rose uppercase tracking-widest">{Math.round(scene.progress || 0)}%</span>
                                  </div>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4 text-soft-rose group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-black text-slate-500 group-hover:text-soft-rose uppercase tracking-widest">Tạo Prompt Cảnh Quay</span>
                                  </>
                                )}
                              </button>

                              <button 
                                onClick={() => addSceneBetween(episode.id, idx)}
                                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-soft-rose/20 hover:text-soft-rose/60 transition-all bg-white group"
                              >
                                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Thêm cảnh quay mới</span>
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Add Scene Button Between */}
                        <div className="flex justify-center -my-4 relative z-10">
                          <button
                            onClick={() => addSceneBetween(episode.id, idx)}
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-all group"
                            title="Thêm cảnh mới vào đây"
                          >
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-soft-rose" />
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryStudioModule;
