
import React, { useState, useEffect } from 'react';
import { Film, Key, X, Save, AlertCircle, MessageSquare, MessageSquareOff } from 'lucide-react';
import CinematicPromptModule from './modules/CinematicPromptModule';
import StoryStudioModule from './modules/StoryStudioModule';
import ErrorBoundary from './components/ErrorBoundary';
import { loadState, saveState } from './services/persistenceService';
import { getStoredKeys, saveStoredKeys } from './services/keyService';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dialogue' | 'no-dialogue'>(() => {
    return loadState<'dialogue' | 'no-dialogue'>('activeTab', 'dialogue');
  });
  const [activeModule, setActiveModule] = useState<'cinematic' | 'studio'>(() => {
    return loadState<'cinematic' | 'studio'>('activeModule', 'cinematic');
  });
  const [showApiModal, setShowApiModal] = useState(false);
  const [tempKeys, setTempKeys] = useState('');

  useEffect(() => {
    saveState('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveState('activeModule', activeModule);
  }, [activeModule]);

  const openApiModal = () => {
    const keys = getStoredKeys();
    setTempKeys(keys.map(k => k.key).join('\n'));
    setShowApiModal(true);
  };

  const handleSaveKeys = () => {
    const keysArray = tempKeys.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    saveStoredKeys(keysArray);
    setShowApiModal(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-black font-sans pb-20 selection:bg-orange-primary selection:text-white relative">
        <nav className="bg-bg-dark/80 backdrop-blur-md min-h-[4rem] lg:h-24 flex items-center sticky top-0 z-50 py-2 lg:py-0 border-b border-white/5">
          <div className="max-w-7xl mx-auto w-full px-3 lg:px-8 flex flex-col lg:flex-row justify-between items-center gap-2 lg:gap-0 relative">
            <div className="flex flex-col leading-none items-center lg:items-start lg:order-1">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-6 h-6 lg:w-10 lg:h-10 bg-orange-primary rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.3)] shrink-0">
                  <Film className="w-3 h-3 lg:w-5 lg:h-5 text-white" />
                </div>
                <span className="text-orange-primary font-sans text-sm lg:text-3xl font-bold tracking-tight text-center lg:text-left whitespace-nowrap">
                  HÀI VỢ CHỒNG <span className="text-orange-light italic">ENGINE</span>
                </span>
              </div>
              <span className="text-orange-primary/60 font-black text-[6px] lg:text-[9px] tracking-[0.15em] lg:tracking-[0.4em] uppercase mt-1 lg:mt-2 lg:ml-14 w-full text-center lg:text-left whitespace-nowrap">
                Tạo Prompt Video Hài Hước Chuyên Nghiệp
              </span>
            </div>
            <div className="flex items-center gap-1.5 lg:gap-4 lg:order-2 justify-center flex-wrap">
               <div className="flex bg-white/5 p-0.5 lg:p-1 rounded-xl lg:rounded-2xl border border-white/10">
                 <button 
                   onClick={() => setActiveModule('cinematic')}
                   className={`px-2.5 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl text-[7px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${activeModule === 'cinematic' ? 'bg-orange-primary text-white shadow-lg shadow-orange-primary/20' : 'text-white/40 hover:text-white/60'}`}
                 >
                   Cinematic
                 </button>
                 <button 
                   onClick={() => setActiveModule('studio')}
                   className={`px-2.5 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl text-[7px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${activeModule === 'studio' ? 'bg-orange-primary text-white shadow-lg shadow-orange-primary/20' : 'text-white/40 hover:text-white/60'}`}
                 >
                   Studio
                 </button>
               </div>

               <div className="flex bg-white/5 p-0.5 lg:p-1 rounded-xl lg:rounded-2xl items-center border border-white/10">
                 <button 
                   onClick={() => setActiveTab('dialogue')}
                   className={`px-2.5 lg:px-6 py-1.5 lg:py-2.5 rounded-lg lg:rounded-xl text-[7px] lg:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 lg:gap-2 ${activeTab === 'dialogue' ? 'bg-orange-primary text-white shadow-lg shadow-orange-primary/20' : 'text-white/40 hover:text-white/60'}`}
                 >
                   <MessageSquare className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" />
                   <span className="hidden xs:inline">Hài Có Thoại</span>
                   <span className="xs:hidden">Có Thoại</span>
                 </button>
                 <button 
                   onClick={() => setActiveTab('no-dialogue')}
                   className={`px-2.5 lg:px-6 py-1.5 lg:py-2.5 rounded-lg lg:rounded-xl text-[7px] lg:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 lg:gap-2 ${activeTab === 'no-dialogue' ? 'bg-orange-primary text-white shadow-lg shadow-orange-primary/20' : 'text-white/40 hover:text-white/60'}`}
                 >
                   <MessageSquareOff className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" />
                   <span className="hidden xs:inline">Hài Không Thoại</span>
                   <span className="xs:hidden">Ko Thoại</span>
                 </button>
                 <div className="w-px h-3 lg:h-4 bg-white/10 mx-0.5 lg:mx-1" />
                 <button 
                   onClick={openApiModal}
                   className="p-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-white/60 hover:text-orange-primary hover:bg-white/5 transition-all flex items-center gap-1 lg:gap-2"
                   title="Quản lý API"
                 >
                   <Key className="w-3 h-3 lg:w-4 lg:h-4" />
                   <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">API</span>
                 </button>
               </div>
            </div>
          </div>
        </nav>
        <main className="relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-orange-primary/5 blur-[120px] -z-10 pointer-events-none" />
          {activeModule === 'cinematic' && <CinematicPromptModule mode={activeTab} />}
          {activeModule === 'studio' && <StoryStudioModule mode={activeTab} />}
        </main>
        <footer className="fixed bottom-0 left-0 right-0 min-h-[4.5rem] bg-bg-dark/95 backdrop-blur-xl flex items-center justify-center z-40 px-4 py-3 border-t border-white/5">
           <div className="flex flex-col items-center gap-2 text-center">
             <span className="text-[7px] md:text-[9px] font-black text-orange-primary/40 uppercase tracking-[0.2em] md:tracking-[0.3em] leading-tight">
               © 2026 Hài Vợ Chồng AI Engine — Phiên bản Cao cấp dành cho Học viên
             </span>
             <div className="h-px w-12 bg-orange-primary/20 md:hidden" />
             <span className="text-[7px] md:text-[8px] font-medium text-white/30 uppercase tracking-[0.15em] md:tracking-[0.2em] leading-tight">
               Học làm phim AI chuyên nghiệp
             </span>
           </div>
        </footer>

        {/* API Management Modal */}
        <AnimatePresence>
          {showApiModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowApiModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-bg-dark rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,107,0,0.1)] z-10 border border-white/10"
              >
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,0,0.3)]">
                        <Key className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-sans font-bold text-orange-primary tracking-tight">Quản lý API Key</h2>
                        <p className="text-[10px] font-black text-orange-primary/60 uppercase tracking-[0.2em]">Tối ưu hóa hiệu suất AI</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowApiModal(false)}
                      className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-orange-primary transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="p-4 bg-orange-primary/5 rounded-2xl flex items-start gap-4 border border-orange-primary/10">
                      <AlertCircle className="w-5 h-5 text-orange-primary shrink-0 mt-0.5" />
                      <div className="text-[11px] text-white/60 leading-relaxed">
                        Nhập danh sách API Key của bạn (mỗi dòng một Key). Hệ thống sẽ <span className="text-orange-primary font-bold italic">tự động chuyển sang Key dự phòng</span> nếu Key hiện tại hết lượt truy cập trong ngày.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-orange-primary uppercase tracking-widest ml-1">Danh sách API Key</label>
                      <textarea 
                        value={tempKeys}
                        onChange={(e) => setTempKeys(e.target.value)}
                        className="w-full bg-bg-black border border-white/10 rounded-2xl p-5 text-xs text-white font-mono min-h-[200px] focus:ring-1 focus:ring-orange-primary/50 transition-all outline-none leading-relaxed"
                        placeholder="Dán các API Key của bạn vào đây, mỗi dòng một Key..."
                      />
                    </div>

                    <button 
                      onClick={handleSaveKeys}
                      className="w-full py-4 bg-orange-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-orange-dark transition-all shadow-[0_10px_20px_rgba(255,107,0,0.2)]"
                    >
                      <Save className="w-4 h-4" />
                      Lưu cấu hình API
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

export default App;
