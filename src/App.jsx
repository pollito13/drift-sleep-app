import React, { useState, useEffect, useRef } from 'react';
import { Moon, Wind, PenLine, Volume2, VolumeX, ChevronLeft, Plus, Trash2, Cloud, Sparkles, BookOpen, X, ChevronRight } from 'lucide-react';

// --- Gemini API Helper ---
const callGemini = async (prompt) => {
  try {
    const apiKey = ""; // Runtime provided
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

  // Check for first time user
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

  // Shared Audio Context State
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
    
    // Generate Pink Noise (Paul Kellet's method)
    // 1/f noise - balanced and natural like rainfall
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
      data[i] *= 0.11; // Normalize to roughly -1 to 1
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    // Slight lowpass to remove very harsh highs if any remain
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
      
      {/* Onboarding Overlay */}
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}

      {/* Header */}
      <div className="w-full max-w-md p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-400" />
          <span className="text-lg font-medium tracking-wide text-indigo-100">Drift</span>
        </div>
        <button 
          onClick={toggleNoise}
          className={`p-3 rounded-full transition-all duration-500 ${!isMuted ? 'bg-indigo-900/30 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}
          aria-label="Toggle Pink Noise"
        >
          {!isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Content Area */}
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
      desc: "Tap the speaker icon in the top right to play soothing Pink Noise. It masks silence and calms the brain.",
      icon: <Volume2 className="w-12 h-12 text-indigo-400" />
    },
    {
      title: "Breathe & Count",
      desc: "Use the 4-7-8 breathing guide or the sheep counter to lower your heart rate.",
      icon: <Wind className="w-12 h-12 text-indigo-400" />
    },
    {
      title: "Clear Your Mind",
      desc: "Use the Journal to dump your thoughts, or ask our AI to tell you a boring bedtime story.",
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

  const increment = () => {
    setCount(c => c + 1);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
  };

  return (
    <button 
      onClick={increment}
      className="w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in duration-700 active:scale-[0.98] transition-transform"
    >
      <div className="relative h-48 w-full flex items-center justify-center">
         <div className={`text-8xl transition-all duration-500 ${animating ? '-translate-y-12 rotate-6 opacity-100' : 'translate-y-0 opacity-80'}`}>
            🐑
         </div>
         <div className="absolute bottom-0 w-32 h-2 bg-indigo-900/30 rounded-full blur-md"></div>
      </div>

      <div className="text-center">
        <div className="text-6xl font-thin text-indigo-100 tabular-nums">
          {count}
        </div>
        {/* Changed text color to be more visible (same as instructions) */}
        <div className="text-indigo-200 text-sm mt-2 uppercase tracking-widest">
          Sheep Counted
        </div>
      </div>
      
      <div className="text-slate-600 text-xs mt-8">
        Tap anywhere to count
      </div>
    </button>
  );
};

const BrainDump = () => {
  const [view, setView] = useState('list');
  const [entries, setEntries] = useState([]);
  
  // Editor State
  const [currentId, setCurrentId] = useState(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentBody, setCurrentBody] = useState('');

  // AI State
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
        aiAdvice: aiAdvice // Save the advice too
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
      
      {/* AI Advice Box */}
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
    setStory(''); // Clear previous
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

export default App;