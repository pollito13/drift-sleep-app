import { useState, useEffect, useRef } from 'react';
import { Moon, Wind, PenLine, Volume2, VolumeX, ChevronLeft, Plus, Trash2, Cloud, Sparkles, BookOpen, ChevronRight, Settings, X } from 'lucide-react';

// --- Gemini API Helper ---
const callGemini = async (prompt) => {
  try {
    let apiKey = "";

    // 1. Try Vercel Environment Variable (Secure for Live App)
    // We use optional chaining (?.) to prevent crashes in Preview if env is missing
    try {
      apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
    } catch (e) {
      // Ignore env errors in preview
    }

    // 2. If no Env Var found, look for User's Local Storage Key (Settings Menu)
    if (!apiKey) {
       apiKey = localStorage.getItem('drift_api_key');
    }

    if (!apiKey) {
      console.warn("Missing API Key");
      return "Please add your API Key in Settings to use this feature.";
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "The stars are cloudy right now... try again.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not reach the dream realm.";
  }
};

const App = () => {
  const [activeTab, setActiveTab] = useState('breathe');
  const [isMuted, setIsMuted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('drift_onboarding_seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const closeOnboarding = () => {
    localStorage.setItem('drift_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const noiseNodeRef = useRef(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  const initAudio = () => {
    if (audioContextRef.current) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const bufferSize = ctx.sampleRate * 2; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Pink Noise Generator
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; 
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5000; 

    const gain = ctx.createGain();
    gain.gain.value = 0.15; 

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noiseNodeRef.current = noise;
    gainNodeRef.current = gain;
    
    setAudioInitialized(true);
  };

  const toggleNoise = () => {
    if (!audioInitialized) initAudio();
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (!noiseNodeRef.current) return;

    try {
        noiseNodeRef.current.start(0);
    } catch (e) { }

    const targetVolume = isMuted ? 0.2 : 0;
    const currentTime = audioContextRef.current.currentTime;
    gainNodeRef.current.gain.cancelScheduledValues(currentTime);
    gainNodeRef.current.gain.setTargetAtTime(targetVolume, currentTime, 0.5);

    setIsMuted(!isMuted);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col items-center justify-between overflow-hidden selection:bg-indigo-900 selection:text-white relative">
      
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div className="w-full max-w-md p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-400" />
          <span className="text-lg font-medium tracking-wide text-indigo-100">Drift</span>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-full bg-slate-900 text-slate-600 hover:text-indigo-400 hover:bg-indigo-900/30 transition-all"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleNoise}
            className={`p-3 rounded-full transition-all duration-500 ${!isMuted ? 'bg-indigo-900/30 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}
          >
            {!isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-md flex flex-col justify-center items-center relative p-6 overflow-hidden">
        {activeTab === 'breathe' && <BreathingExercise />}
        {activeTab === 'sheep' && <SheepCounter />}
        {activeTab === 'journal' && <BrainDump />}
        {activeTab === 'dream' && <DreamScapes />}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-md p-6 z-10">
        <div className="flex justify-around items-center bg-slate-900/50 backdrop-blur-md rounded-2xl p-2 border border-slate-800 shadow-xl">
          <NavButton 
            active={activeTab === 'breathe'} 
            onClick={() => setActiveTab('breathe')} 
            icon={<Wind className="w-5 h-5" />} 
            label="Breathe" 
          />
           <NavButton 
            active={activeTab === 'sheep'} 
            onClick={() => setActiveTab('sheep')} 
            icon={<Cloud className="w-5 h-5" />} 
            label="Sheep" 
          />
          <NavButton 
            active={activeTab === 'journal'} 
            onClick={() => setActiveTab('journal')} 
            icon={<PenLine className="w-5 h-5" />} 
            label="Journal" 
          />
          <NavButton 
            active={activeTab === 'dream'} 
            onClick={() => setActiveTab('dream')} 
            icon={<BookOpen className="w-5 h-5" />} 
            label="Dream" 
          />
        </div>
      </div>
      
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${active ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-500 hover:text-slate-400'}`}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const Onboarding = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Drift",
      desc: "A quiet space designed to help you disconnect and fall asleep.",
      icon: <Moon className="w-12 h-12 text-indigo-400" />
    },
    {
      title: "Pink Noise",
      desc: "Tap the speaker icon in the top right to play soothing Pink Noise.",
      icon: <Volume2 className="w-12 h-12 text-indigo-400" />
    },
    {
      title: "Count Sheep",
      desc: "Tap to count our hand-drawn flock. It's surprisingly boring (in a good way).",
      icon: <Cloud className="w-12 h-12 text-indigo-400" />
    },
    {
      title: "Clear Your Mind",
      desc: "Use the Journal to dump your thoughts or get AI sleep advice.",
      icon: <Sparkles className="w-12 h-12 text-indigo-400" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <div className="mb-6 p-4 bg-indigo-900/20 rounded-full">
          {steps[step].icon}
        </div>
        <h2 className="text-2xl font-light text-indigo-100 mb-2">{steps[step].title}</h2>
        <p className="text-slate-400 leading-relaxed mb-8 h-20">
          {steps[step].desc}
        </p>
        
        <div className="flex gap-2 w-full">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            Skip
          </button>
          <button 
            onClick={handleNext}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {step === steps.length - 1 ? "Get Started" : "Next"}
            {step !== steps.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex gap-1 mt-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-800'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Custom Sheep SVGs ---

const SheepCloud = () => (
  <svg viewBox="0 0 100 80" className="w-32 h-32 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
    {/* Legs */}
    <path d="M35 65 L35 75 M75 65 L75 75" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
    {/* Wool - Fluffy Cloud */}
    <path d="M25 50 Q20 35 35 30 Q50 20 65 30 Q80 35 75 50 Q85 60 75 70 Q60 75 40 70 Q25 65 25 50" fill="#e2e8f0" />
    {/* Head - Rounded */}
    <circle cx="25" cy="50" r="14" fill="#1e293b" />
    {/* Ear - Floppy Side Ear (Fixed the 'beak' look) */}
    <ellipse cx="12" cy="50" rx="4" ry="8" fill="#1e293b" transform="rotate(-10 12 50)" />
    {/* Eye */}
    <circle cx="22" cy="47" r="1.5" fill="white" opacity="0.9" />
  </svg>
);

const SheepDark = () => (
  <svg viewBox="0 0 100 80" className="w-32 h-32 drop-shadow-xl">
    {/* Legs */}
    <path d="M40 65 L40 78 M70 65 L70 78" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    {/* Wool - Round and Dark */}
    <circle cx="55" cy="45" r="28" fill="#334155" />
    <circle cx="35" cy="45" r="20" fill="#334155" />
    <circle cx="75" cy="45" r="18" fill="#334155" />
    <circle cx="55" cy="30" r="18" fill="#334155" />
    {/* Head */}
    <circle cx="28" cy="48" r="13" fill="#0f172a" />
    {/* Ear */}
    <ellipse cx="16" cy="50" rx="3" ry="7" fill="#0f172a" transform="rotate(15 16 50)" />
    {/* Eye - Sleeping (U shape) */}
    <path d="M23 46 Q28 50 33 46" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none" /> 
  </svg>
);

const SheepChubby = () => (
  <svg viewBox="0 0 100 80" className="w-32 h-32 drop-shadow-xl">
     {/* Legs - Tiny and stubby */}
     <path d="M40 70 L40 78 M70 70 L70 78" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
     {/* Wool - One Big Fluff */}
     <ellipse cx="55" cy="50" rx="35" ry="25" fill="#f8fafc" />
     {/* Head - Tucked in */}
     <circle cx="30" cy="50" r="15" fill="#1e293b" />
     {/* Ear - Droopy */}
     <path d="M18 50 Q15 55 18 60" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
     {/* Face */}
     <circle cx="26" cy="47" r="1.5" fill="white" />
     {/* Smile */}
     <path d="M28 55 Q30 57 32 55" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

// --- Components ---

const BreathingExercise = () => {
  const [phase, setPhase] = useState('Ready');
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const phaseRef = useRef(phase);
  const timerRef = useRef(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const startBreathing = () => {
    if (isActive) {
      setIsActive(false);
      setPhase('Ready');
      setTimeLeft(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setIsActive(true);
    startPhase('Inhale');
  };

  const startPhase = (newPhase) => {
    setPhase(newPhase);
    let duration = 0;
    if (newPhase === 'Inhale') duration = 4;
    if (newPhase === 'Hold') duration = 7;
    if (newPhase === 'Exhale') duration = 8;
    setTimeLeft(duration);
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            const current = phaseRef.current;
            if (current === 'Inhale') startPhase('Hold');
            else if (current === 'Hold') startPhase('Exhale');
            else if (current === 'Exhale') startPhase('Inhale');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  let circleSize = 'w-32 h-32';
  let circleOpacity = 'opacity-30';
  let glow = '';
  let instruction = 'Tap circle to start';

  if (phase === 'Inhale') {
    circleSize = 'w-64 h-64 duration-[4000ms]';
    circleOpacity = 'opacity-80';
    glow = 'shadow-[0_0_50px_rgba(99,102,241,0.3)]';
    instruction = 'Breathe In';
  } else if (phase === 'Hold') {
    circleSize = 'w-64 h-64 duration-[0ms]'; 
    circleOpacity = 'opacity-80';
    glow = 'shadow-[0_0_30px_rgba(99,102,241,0.5)]';
    instruction = 'Hold Breath';
  } else if (phase === 'Exhale') {
    circleSize = 'w-32 h-32 duration-[8000ms]';
    circleOpacity = 'opacity-30';
    glow = '';
    instruction = 'Whoosh Out';
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-8">
      <div className="relative flex items-center justify-center h-80 w-80">
        <button 
          onClick={startBreathing}
          className={`
            rounded-full bg-indigo-500 transition-all ease-in-out z-10 flex flex-col items-center justify-center
            ${circleSize} ${circleOpacity} ${glow}
          `}
        >
          <span className="text-white font-light text-lg tracking-widest uppercase mb-1">
            {isActive ? phase : 'Start'}
          </span>
          {isActive && (
             <span className="text-white font-bold text-3xl font-mono">
               {timeLeft}
             </span>
          )}
        </button>
        <div className="absolute border border-indigo-900/30 rounded-full w-32 h-32 pointer-events-none"></div>
        <div className="absolute border border-indigo-900/20 rounded-full w-64 h-64 pointer-events-none"></div>
      </div>
      
      <div className="text-center h-16">
        <p className={`text-xl font-light text-indigo-200 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
          {instruction}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          {isActive ? 'Follow the numbers' : '4-7-8 Technique'}
        </p>
      </div>
    </div>
  );
};

const SheepCounter = () => {
  const [count, setCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [sheepType, setSheepType] = useState(0); // 0: Cloud, 1: Dark, 2: Chubby

  const increment = () => {
    // Pick a new random sheep that is different from the current one to ensure variety
    let nextType = Math.floor(Math.random() * 3);
    while (nextType === sheepType) {
        nextType = Math.floor(Math.random() * 3);
    }
    
    setSheepType(nextType);
    setCount(c => c + 1);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
  };

  const renderSheep = () => {
    switch(sheepType) {
        case 0: return <SheepCloud />;
        case 1: return <SheepDark />;
        case 2: return <SheepChubby />;
        default: return <SheepCloud />;
    }
  };

  return (
    <button 
      onClick={increment}
      className="w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in duration-700 active:scale-[0.98] transition-transform"
    >
      <div className="relative h-48 w-full flex items-center justify-center">
         {/* Jump Animation */}
         <div className={`transition-all duration-500 ${animating ? '-translate-y-16 -rotate-6 scale-110 opacity-100' : 'translate-y-0 opacity-80'}`}>
            {renderSheep()}
         </div>
         <div className="absolute bottom-0 w-32 h-4 bg-indigo-950/50 rounded-[100%] blur-md scale-x-110"></div>
      </div>

      <div className="text-center">
        <div className="text-6xl font-thin text-indigo-100 tabular-nums">
          {count}
        </div>
        <div className="text-indigo-200 text-sm mt-2 uppercase tracking-widest">
          Sheep Counted
        </div>
      </div>
      
      <div className="text-slate-600 text-xs mt-8">
        Tap to count the flock
      </div>
    </button>
  );
};

const BrainDump = () => {
  const [view, setView] = useState('list');
  const [entries, setEntries] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentBody, setCurrentBody] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sleep-journal-entries');
      if (saved) {
        setEntries(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load entries", e);
    }
  }, []);

  const saveToStorage = (newEntries) => {
    localStorage.setItem('sleep-journal-entries', JSON.stringify(newEntries));
  };

  const handleSave = () => {
    if (!currentBody.trim() && !currentTitle.trim()) {
       setView('list');
       return;
    }

    const timestamp = new Date().toISOString();
    let newEntries = [];
    const entryData = {
        title: currentTitle || 'Untitled Thought',
        body: currentBody,
        updatedAt: timestamp,
        aiAdvice: aiAdvice
    };

    if (currentId) {
      newEntries = entries.map(e => e.id === currentId ? { ...e, ...entryData } : e);
    } else {
      newEntries = [{ id: Date.now().toString(), createdAt: timestamp, ...entryData }, ...entries];
    }
    
    setEntries(newEntries);
    saveToStorage(newEntries);
    setView('list');
    resetEditor();
  };

  const handleSoothe = async () => {
    if (!currentBody) return;
    setIsGenerating(true);
    const prompt = `You are a compassionate sleep therapist. The user wrote this journal entry about what is keeping them awake: "${currentBody}". Write a very short, soothing, validating response (max 40 words) that helps them let go of this thought and sleep. Be gentle, warm, and calming.`;
    const response = await callGemini(prompt);
    setAiAdvice(response);
    setIsGenerating(false);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const newEntries = entries.filter(item => item.id !== id);
    setEntries(newEntries);
    saveToStorage(newEntries);
    if (currentId === id) setView('list');
  };

  const openEntry = (entry) => {
    setCurrentId(entry.id);
    setCurrentTitle(entry.title);
    setCurrentBody(entry.body);
    setAiAdvice(entry.aiAdvice || '');
    setView('editor');
  };

  const createNew = () => {
    resetEditor();
    setView('editor');
  };

  const resetEditor = () => {
    setCurrentId(null);
    setCurrentTitle('');
    setCurrentBody('');
    setAiAdvice('');
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (view === 'list') {
    return (
      <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-light text-indigo-100">Journal</h2>
          <button 
            onClick={createNew}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {entries.length === 0 ? (
            <div className="text-center text-slate-600 mt-20 flex flex-col items-center">
              <PenLine className="w-12 h-12 mb-4 opacity-20" />
              <p>No thoughts recorded yet.</p>
              <p className="text-sm mt-2">Clear your mind to sleep better.</p>
            </div>
          ) : (
            entries.map(entry => (
              <div 
                key={entry.id}
                onClick={() => openEntry(entry)}
                className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl cursor-pointer hover:bg-slate-800/60 transition-colors group relative"
              >
                <div className="flex justify-between items-start">
                   <h3 className="text-indigo-200 font-medium truncate pr-8">{entry.title}</h3>
                   <span className="text-xs text-slate-500">{formatDate(entry.updatedAt)}</span>
                </div>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{entry.body}</p>
                
                <button 
                   onClick={(e) => handleDelete(entry.id, e)}
                   className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/30 rounded-md text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Editor View
  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <button 
          onClick={handleSave} 
          className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <div className="flex gap-2">
           {currentBody.length > 5 && !aiAdvice && (
              <button 
                onClick={handleSoothe}
                disabled={isGenerating}
                className="flex items-center gap-1 text-xs bg-indigo-900/50 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:bg-indigo-900 transition-colors"
              >
                <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Listening...' : 'Soothe Mind'}
              </button>
           )}
          <button 
            onClick={handleSave}
            className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-700"
          >
            Save
          </button>
        </div>
      </div>

      <input 
        type="text"
        value={currentTitle}
        onChange={(e) => setCurrentTitle(e.target.value)}
        placeholder="Title (optional)"
        className="bg-transparent border-b border-slate-800 py-2 text-xl font-light text-indigo-100 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-700"
      />
      
      <textarea
        value={currentBody}
        onChange={(e) => setCurrentBody(e.target.value)}
        placeholder="What's keeping you up? Type it out..."
        className="
          flex-1 w-full bg-slate-900/30 border-none rounded-xl p-4
          text-slate-300 placeholder:text-slate-700 resize-none 
          focus:ring-1 focus:ring-indigo-900/50 focus:outline-none
          text-lg leading-relaxed font-light
        "
        spellCheck="false"
      />
      
      {aiAdvice && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-xl animate-in slide-in-from-bottom-2 fade-in">
           <div className="flex items-center gap-2 mb-2 text-indigo-300">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest font-semibold">Insight</span>
           </div>
           <p className="text-indigo-100/90 text-sm leading-relaxed italic">
             "{aiAdvice}"
           </p>
        </div>
      )}
    </div>
  );
};

const DreamScapes = () => {
  const [subTab, setSubTab] = useState('story');
  
  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl self-center mb-2">
        <button 
          onClick={() => setSubTab('story')}
          className={`px-4 py-1.5 rounded-lg text-sm transition-all ${subTab === 'story' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Story
        </button>
        <button 
          onClick={() => setSubTab('tips')}
          className={`px-4 py-1.5 rounded-lg text-sm transition-all ${subTab === 'tips' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Tips
        </button>
      </div>
      
      {subTab === 'story' ? <StoryGenerator /> : <SleepTips />}
    </div>
  );
};

const StoryGenerator = () => {
  const [theme, setTheme] = useState('Rainy Forest');
  const [story, setStory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const themes = ['Rainy Forest', 'Cosmic Drift', 'Quiet Library', 'Ocean Depths', 'Snowy Cabin'];

  const generateStory = async () => {
    setIsGenerating(true);
    setStory('');
    const prompt = `Write a very slow, boring, and extremely calming bedtime story set in a "${theme}". Focus purely on sensory details like soft sounds, dim lights, colors, and stillness. Avoid any plot, conflict, or characters. Just describe the peaceful environment to help someone fall asleep. Keep it under 150 words.`;
    const response = await callGemini(prompt);
    setStory(response);
    setIsGenerating(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col gap-4 items-center mb-6">
        <h3 className="text-indigo-200 font-light text-lg">Choose a setting</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {themes.map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${theme === t ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
        
        <button
          onClick={generateStory}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-6 py-2 rounded-full transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Weaving Dream...' : 'Tell me a story'}
        </button>
      </div>

      <div className="flex-1 bg-slate-900/30 rounded-2xl p-6 overflow-y-auto border border-slate-800/50">
        {story ? (
          <p className="text-slate-300 font-light leading-loose text-lg animate-in fade-in duration-1000">
            {story}
          </p>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-700 text-sm italic">
            Select a theme to begin your journey...
          </div>
        )}
      </div>
    </div>
  );
};

const SleepTips = () => {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
      <Tip 
        title="The 4-7-8 Method"
        desc="Inhale quietly through the nose for 4 seconds. Hold the breath for 7 seconds. Exhale forcefully through the mouth, making a whoosh sound, for 8 seconds."
      />
      <Tip 
        title="Screen Dimming"
        desc="You are using this app, but try to lower your brightness to the absolute minimum. Blue light suppresses melatonin."
      />
      <Tip 
        title="The 20 Minute Rule"
        desc="If you can't sleep after 20 minutes, don't force it. Get up, do something boring in dim light, and return when tired."
      />
      <Tip 
        title="Progressive Relaxation"
        desc="Start at your toes. Tense them for 5 seconds, then relax. Move to your calves, thighs, and work your way up to your head."
      />
    </div>
  );
};

const Tip = ({ title, desc }) => (
  <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/50 shrink-0">
    <h3 className="text-indigo-300 font-medium mb-2">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

const SettingsModal = ({ onClose }) => {
  const [key, setKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('drift_api_key');
    if (savedKey) setKey(savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('drift_api_key', key);
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem('drift_api_key');
    setKey('');
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-light text-indigo-100">Settings</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2">Gemini API Key</label>
          <input 
            type="password" 
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste key here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
            Required for Dream stories and Journal soothing. Saved locally on your device.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleClear}
            className="flex-1 py-2 text-slate-500 hover:text-red-400 text-sm transition-colors border border-transparent hover:border-slate-800 rounded-lg"
          >
            Clear
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;