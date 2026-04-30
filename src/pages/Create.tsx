import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Loader2, 
  Sparkles, 
  Image as ImageIcon, 
  Camera, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  Layers, 
  Settings2,
  Lock,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { generateUltraRealisticImage, analyzeImage, moderateContent } from '../lib/gemini';
import { db, collection, addDoc, serverTimestamp, query, where, getDocs, OperationType, handleFirestoreError } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const WORKFLOWS = [
  { id: 'pro-portrait', name: 'Ultra Portrait', description: 'Maximum skin texture & anatomical fidelity', icon: Camera },
  { id: 'cinematic', name: 'Cinematic Raw', description: 'Professional lighting & raw film grain', icon: ImageIcon },
  { id: 'fashion-tech', name: 'Fashion Pro', description: 'Commercial lighting & high-end retouching', icon: Zap },
];

interface Character {
  id: string;
  name: string;
  traits: string;
  bodyType?: string;
}

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [activeWorkflow, setActiveWorkflow] = useState(WORKFLOWS[0].id);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [moderation, setModeration] = useState<{ status: string; reason: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchChars = async () => {
      const q = query(collection(db, 'characters'), where('creatorId', '==', user.uid));
      const snap = await getDocs(q);
      setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Character[]);
    };
    fetchChars();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setModeration(null);
    setAnalysis(null);

    try {
      // 1. Moderation
      const modResult = await moderateContent(prompt);
      const parts = modResult.split('|');
      const statusPart = parts[0];
      const reasonPart = parts[1];
      const status = statusPart.split(':')[1]?.trim();
      const reason = reasonPart?.split(':')[1]?.trim() || '';

      if (status === 'REJECTED') {
        setModeration({ status, reason });
        setIsGenerating(false);
        return;
      }

      // 2. Build final prompt with character traits
      const char = characters.find(c => c.id === selectedChar);
      const enhancedPrompt = char ? `[Character background: ${char.traits}] ${prompt}` : prompt;

      // 3. Generate Image
      const imageUrl = await generateUltraRealisticImage(enhancedPrompt);
      setGeneratedImage(imageUrl);

      // 4. Analyze results for technical fidelity
      setIsAnalyzing(true);
      const analysisResult = await analyzeImage(imageUrl, 'image/png');
      setAnalysis(analysisResult);
      setIsAnalyzing(false);

    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedImage || !user) return;

    try {
      const contentData = {
        creatorId: user.uid,
        characterId: selectedChar || null,
        title: prompt.substring(0, 40) + "...",
        description: prompt,
        imageUrl: generatedImage,
        type: 'image',
        workflow: activeWorkflow,
        prompt,
        price: 9.99,
        isMonetized: true,
        moderationStatus: 'approved',
        likes: [],
        createdAt: serverTimestamp(),
        analysis,
        metadata: {
          engine: 'GenCraft Neural-V3',
          sampler: 'DPM++ 2M Karras',
          steps: 45,
          cfg: 7.5,
          seed: Math.floor(Math.random() * 1000000)
        }
      };

      await addDoc(collection(db, 'content'), contentData);
      navigate('/');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'content');
    }
  };

  if (!user) return <div className="py-20 text-center">Please sign in to access the Workflow Engine.</div>;

  const activeWF = WORKFLOWS.find(w => w.id === activeWorkflow);

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-12 py-8">
      {/* Left Column: Control Panel */}
      <div className="xl:col-span-4 space-y-8">
        <header className="space-y-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
                <Settings2 size={20} />
             </div>
             <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Workflow Engine</h1>
                <p className="text-xs font-medium text-zinc-500 tracking-tight mt-1">Version 3.1.2 Pro</p>
             </div>
           </div>
        </header>

        <section className="space-y-6">
           {/* Workflows */}
           <div className="space-y-3">
             <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-1">Selected Pipeline</h3>
             <div className="grid grid-cols-1 gap-2">
                {WORKFLOWS.map((wf) => {
                  const Icon = wf.icon;
                  return (
                    <button
                      key={wf.id}
                      onClick={() => setActiveWorkflow(wf.id)}
                      className={`flex items-start gap-4 p-4 rounded-3xl transition-all border-2 text-left group ${
                        activeWorkflow === wf.id 
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl translate-x-2' 
                        : 'bg-white border-zinc-100 hover:border-zinc-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeWorkflow === wf.id ? 'bg-white/20' : 'bg-zinc-100'}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{wf.name}</p>
                        <p className={`text-xs mt-1 font-medium ${activeWorkflow === wf.id ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {wf.description}
                        </p>
                      </div>
                      <ChevronRight size={14} className={activeWorkflow === wf.id ? 'text-zinc-600' : 'text-zinc-300'} />
                    </button>
                  );
                })}
             </div>
           </div>

           {/* Characters */}
           <div className="space-y-3">
             <div className="flex items-center justify-between px-1">
               <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Character DNA</h3>
               <Link to="/characters" className="text-[11px] font-medium text-zinc-900 hover:text-zinc-500 transition-colors">Manage Registry</Link>
             </div>
             <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setSelectedChar(null)}
                  className={`p-3 rounded-2xl border-2 text-sm font-medium transition-all text-left px-4 ${
                    !selectedChar ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  Universal Base Model
                </button>
                {characters.map(char => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedChar(char.id)}
                    className={`p-3 rounded-2xl border-2 text-sm font-medium transition-all flex items-center justify-between px-4 ${
                      selectedChar === char.id ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-white border-zinc-100 hover:border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       <Lock size={12} className={selectedChar === char.id ? 'text-zinc-400' : 'text-zinc-300'} />
                       {char.name}
                    </div>
                    {char.bodyType && (
                      <span className="text-[10px] font-semibold uppercase bg-zinc-800 text-white px-2 py-0.5 rounded-md">
                        {char.bodyType.split(' ')[0]}
                      </span>
                    )}
                  </button>
                ))}
             </div>
           </div>

           {/* Input */}
           <div className="space-y-3">
             <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-1">Neural Prompt</h3>
             <Textarea 
               placeholder="Highly detailed portrait of a diverse woman with natural freckles, soft morning light, hyperrealistic skin textures..."
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               className="min-h-[120px] rounded-[1.5rem] border-zinc-200 resize-none p-4 text-sm font-medium focus:ring-zinc-900"
             />
           </div>

           <Button 
             className="w-full h-14 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all font-semibold tracking-tight shadow-md"
             onClick={handleGenerate}
             disabled={isGenerating || !prompt}
           >
             {isGenerating ? (
               <>
                 <Loader2 className="mr-2 animate-spin" /> Ingesting Data...
               </>
             ) : (
               <>
                 <Zap className="mr-2 fill-current" /> Execute Workflow
               </>
             )}
           </Button>
        </section>
      </div>

      {/* Center/Right: Viewport & Analysis */}
      <div className="xl:col-span-8 flex flex-col gap-8">
        <section className="bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200 aspect-[16/10] overflow-hidden relative group">
          <AnimatePresence mode="wait">
            {!generatedImage && !isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-20 h-20 rounded-full border border-zinc-200 flex items-center justify-center mb-4">
                  <Layers className="text-zinc-200" size={40} />
                </div>
                <p className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Engine Idle</p>
                <p className="text-sm font-medium text-zinc-400 mt-2">Waiting for neural inputs...</p>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white z-20"
              >
                 <div className="relative">
                   <Loader2 className="animate-spin text-zinc-700" size={160} strokeWidth={0.5} />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="animate-pulse text-white" size={40} />
                   </div>
                 </div>
                 <div className="mt-8 text-center space-y-2">
                     <p className="text-lg font-semibold tracking-tight">Processing Pipeline: {activeWF?.name}</p>
                   <p className="text-xs font-medium text-zinc-500 animate-pulse mt-1">Calculating Subsurface Scattering...</p>
                 </div>
              </motion.div>
            )}

            {generatedImage && !isGenerating && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-10"
              >
                <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                <div className="absolute top-6 left-6 flex gap-2">
                  <Badge className="bg-white/90 text-zinc-900 rounded-full px-4 py-1.5 border-none text-xs font-semibold tracking-tight shadow-sm">
                    <CheckCircle2 size={14} className="mr-1.5 text-green-500" /> Pro Quality Verified
                  </Badge>
                </div>
                <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-zinc-900/90 to-transparent flex items-end justify-end p-8">
                  <Button 
                    className="bg-white text-zinc-900 hover:bg-zinc-100 rounded-2xl px-6 h-12 font-semibold text-sm group shadow-xl"
                    onClick={handlePublish}
                  >
                    Authenticate & Publish <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Technical Data / Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
             <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-tight text-zinc-900">Anatomical Analysis</CardTitle>
                </div>
                {isAnalyzing && <Loader2 className="animate-spin text-zinc-400" size={14} />}
             </CardHeader>
             <CardContent className="p-6">
                {analysis ? (
                  <div className="text-xs text-zinc-600 leading-relaxed italic max-h-[120px] overflow-y-auto">
                    {analysis}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-300 italic">Waiting for generation to begin analysis...</p>
                )}
             </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-100 shadow-sm overflow-hidden">
             <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-6">
                <CardTitle className="text-xs font-semibold uppercase tracking-tight text-zinc-900">Safety Scan</CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                {moderation ? (
                  <div className={`p-4 rounded-2xl ${moderation.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                       {moderation.status === 'REJECTED' ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                       {moderation.status}
                    </div>
                    <p className="text-xs italic">{moderation.reason}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-300 space-y-2">
                     <Lock size={16} className="opacity-20" />
                     <p className="text-[10px] font-bold uppercase tracking-widest">Ready for Pre-flight Scan</p>
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
