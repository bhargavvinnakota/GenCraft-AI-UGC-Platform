import { useState, useEffect, ElementType } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, collection, addDoc, query, where, getDocs, serverTimestamp, OperationType, handleFirestoreError } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  BarChart, 
  Palette, 
  PenTool, 
  Wand2, 
  Layers, 
  Plus, 
  Settings, 
  TrendingUp, 
  Users, 
  DollarSign,
  Activity,
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini directly for script generation if needed
const ai = new GoogleGenAI({ 
  apiKey: import.meta.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : "") || "" 
});

type Tab = 'dashboard' | 'campaigns' | 'brandKits' | 'scriptWriter';

// NavItem moved outside the MarketingStudio component to prevent recreation during render
const NavItem = ({ id, label, icon: Icon, activeTab, setActiveTab }: { id: Tab, label: string, icon: ElementType, activeTab: Tab, setActiveTab: (tab: Tab) => void }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
      activeTab === id 
      ? 'bg-zinc-900 text-white shadow-md' 
      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
    }`}
  >
    <Icon size={18} /> {label}
  </button>
);

interface Character {
  id: string;
  name: string;
  traits: string;
}

interface BrandKit {
  id?: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  toneOfVoice: string;
  targetAudience: string;
}

interface Campaign {
  id?: string;
  name: string;
  goal: string;
  status: string;
  budget: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

export default function MarketingStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);

  // States for new Brand Kit
  const [newBrandKit, setNewBrandKit] = useState<BrandKit>({
    name: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter',
    toneOfVoice: 'Professional yet approachable',
    targetAudience: 'Tech-savvy millennials'
  });

  // State for AI Script Writer
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [selectedBrandKitId, setSelectedBrandKitId] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const bkQuery = query(collection(db, 'brandKits'), where('creatorId', '==', user.uid));
        const bkSnap = await getDocs(bkQuery);
        setBrandKits(bkSnap.docs.map(d => ({ id: d.id, ...d.data() })) as BrandKit[]);

        const cpQuery = query(collection(db, 'campaigns'), where('creatorId', '==', user.uid));
        const cpSnap = await getDocs(cpQuery);
        setCampaigns(cpSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Campaign[]);

        const charQuery = query(collection(db, 'characters'), where('creatorId', '==', user.uid));
        const charSnap = await getDocs(charQuery);
        setCharacters(charSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Character[]);
      } catch (error) {
        console.error("Error fetching data", error);
      }
    };
    fetchData();
  }, [user]);

  const handleCreateBrandKit = async () => {
    if (!user || !newBrandKit.name) return;
    try {
      const docRef = await addDoc(collection(db, 'brandKits'), {
        ...newBrandKit,
        creatorId: user.uid,
        createdAt: serverTimestamp()
      });
      setBrandKits([{ id: docRef.id, ...newBrandKit }, ...brandKits]);
      setNewBrandKit({
        name: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        fontFamily: 'Inter',
        toneOfVoice: '',
        targetAudience: ''
      });
      setActiveTab('brandKits');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'brandKits');
    }
  };

  const handleGenerateScript = async () => {
    if (!scriptPrompt) return;
    setIsGeneratingScript(true);
    
    const contextBrand = brandKits.find(b => b.id === selectedBrandKitId);
    const contextCharacter = characters.find(c => c.id === selectedCharacterId);

    const brandInstructions = contextBrand 
      ? `BRAND DNA: Target Audience is "${contextBrand.targetAudience}". Tone of Voice is "${contextBrand.toneOfVoice}". Make sure the script sounds perfectly aligned with this.` 
      : '';
      
    const characterInstructions = contextCharacter 
      ? `CHARACTER EXECUTING SCRIPT: Character name is "${contextCharacter.name}". Known traits: "${contextCharacter.traits}". The character should deliver these lines.` 
      : '';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `You are an expert AI Marketing Director. 
        Create a high-converting short-form video script (TikTok/Reels/Shorts format) based on this prompt: 
        ${scriptPrompt}.
        
        ${brandInstructions}
        ${characterInstructions}
        
        Include: 
        1. A strong HOOK (0-3 seconds)
        2. BODY (Problem/Agitation/Solution)
        3. CALL TO ACTION.
        Format it dynamically with visual cues [in brackets] and spoken lines.`,
      });
      setGeneratedScript(response.text || "");
    } catch (error) {
      console.error(error);
      setGeneratedScript("Failed to generate script. Check console for details.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  if (!user) return <div className="py-20 text-center font-bold text-zinc-400">Restricted Access. Please sign in.</div>;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 py-8 h-[calc(100vh-64px)]">
      {/* Sidebar Navigation */}
      <div className="md:col-span-3 space-y-8 h-full flex flex-col pt-4">
         <div className="px-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-tight">
               Marketing <br /> <span className="text-zinc-400">Studio</span>
            </h1>
            <p className="text-sm font-medium text-zinc-500 tracking-tight mt-2">AI-Driven Growth Engine</p>
         </div>

         <nav className="space-y-2 flex-1">
            <NavItem id="dashboard" label="Performance Dashboard" icon={BarChart} activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="campaigns" label="Campaigns & A/B Tests" icon={Megaphone} activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="brandKits" label="Brand Identity DNA" icon={Palette} activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="scriptWriter" label="Neural Scriptwriter" icon={PenTool} activeTab={activeTab} setActiveTab={setActiveTab} />
         </nav>
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-9 bg-white rounded-[3rem] border border-zinc-200 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-120px)] relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <Activity size={400} />
        </div>

        <div className="flex-1 overflow-y-auto p-10 z-10 space-y-10">
          <AnimatePresence mode="wait">
            
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                 <div>
                   <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                      <BarChart size={24} /> Overview
                   </h2>
                   <p className="text-zinc-500 font-medium">Aggregated performance across AI-generated campaigns.</p>
                 </div>

                 <div className="grid grid-cols-3 gap-6">
                    <Card className="rounded-3xl border-zinc-100 shadow-sm bg-zinc-50/50">
                       <CardContent className="p-6">
                         <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tight mb-1">Total Impressions</p>
                              <p className="text-4xl font-semibold tracking-tight text-zinc-900">1.2M</p>
                            </div>
                            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-600">
                               <TrendingUp size={20} />
                            </div>
                         </div>
                         <div className="mt-4 text-[10px] font-bold text-green-600 flex items-center gap-1 bg-green-50 w-fit px-2 py-1 rounded-lg">
                           <TrendingUp size={12} /> +14.5% vs last month
                         </div>
                       </CardContent>
                    </Card>
                    <Card className="rounded-3xl border-zinc-100 shadow-sm bg-zinc-50/50">
                       <CardContent className="p-6">
                         <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tight mb-1">Conversions</p>
                              <p className="text-4xl font-semibold tracking-tight text-zinc-900">4,821</p>
                            </div>
                            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-600">
                               <Users size={20} />
                            </div>
                         </div>
                         <div className="mt-4 text-[10px] font-bold text-green-600 flex items-center gap-1 bg-green-50 w-fit px-2 py-1 rounded-lg">
                           <TrendingUp size={12} /> +8.2% vs last month
                         </div>
                       </CardContent>
                    </Card>
                    <Card className="rounded-3xl border-zinc-100 shadow-sm bg-zinc-50/50">
                       <CardContent className="p-6">
                         <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tight mb-1">CPA</p>
                              <p className="text-4xl font-semibold tracking-tight text-zinc-900">$1.42</p>
                            </div>
                            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-600">
                               <DollarSign size={20} />
                            </div>
                         </div>
                         <div className="mt-4 text-[10px] font-bold text-green-600 flex items-center gap-1 bg-green-50 w-fit px-2 py-1 rounded-lg">
                           <TrendingUp size={12} /> -12% vs last month
                         </div>
                       </CardContent>
                    </Card>
                 </div>

                 <Card className="rounded-[2.5rem] border-zinc-100 shadow-sm">
                   <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-xl font-semibold tracking-tight">Active Campaigns</CardTitle>
                   </CardHeader>
                   <CardContent className="p-8 pt-0">
                     {campaigns.length > 0 ? (
                       <div className="space-y-4">
                         {campaigns.map(c => (
                           <div key={c.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                              <div>
                                <p className="font-bold text-sm">{c.name}</p>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{c.goal}</p>
                              </div>
                              <Badge className="bg-zinc-100 text-zinc-600 uppercase text-[10px] font-semibold tracking-tight">{c.status}</Badge>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="py-12 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl">
                          <Megaphone size={32} className="mb-4 text-zinc-300" />
                          <p className="font-semibold uppercase tracking-tight text-sm text-zinc-500">No active campaigns.</p>
                       </div>
                     )}
                   </CardContent>
                 </Card>
              </motion.div>
            )}

            {/* TAB: BRAND KITS */}
            {activeTab === 'brandKits' && (
              <motion.div 
                key="brandKits"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                 <div className="flex justify-between items-end">
                   <div>
                     <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                        <Palette size={24} /> Brand DNA
                     </h2>
                     <p className="text-zinc-500 font-medium">Maintain 100% consistency across all AI generated assets.</p>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Create New Kit */}
                    <Card className="rounded-[2.5rem] border-zinc-200 shadow-xl overflow-hidden border-2 bg-zinc-900 text-white">
                       <CardHeader className="p-8">
                         <CardTitle className="text-xl font-semibold tracking-tight">Initialize Brand Core</CardTitle>
                       </CardHeader>
                       <CardContent className="p-8 pt-0 space-y-6">
                         <div className="space-y-2">
                           <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Brand Name</label>
                           <Input 
                             value={newBrandKit.name} 
                             onChange={e => setNewBrandKit({...newBrandKit, name: e.target.value})} 
                             className="bg-zinc-800 border-zinc-700 text-white rounded-xl h-12"
                           />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Primary Hex</label>
                             <div className="flex items-center gap-2">
                               <input type="color" value={newBrandKit.primaryColor} onChange={e => setNewBrandKit({...newBrandKit, primaryColor: e.target.value})} className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent" />
                               <Input value={newBrandKit.primaryColor} className="bg-zinc-800 border-zinc-700 text-white rounded-xl h-12 flex-1 font-mono text-xs" readOnly />
                             </div>
                           </div>
                           <div className="space-y-2">
                             <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Secondary Hex</label>
                             <div className="flex items-center gap-2">
                               <input type="color" value={newBrandKit.secondaryColor} onChange={e => setNewBrandKit({...newBrandKit, secondaryColor: e.target.value})} className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent" />
                               <Input value={newBrandKit.secondaryColor} className="bg-zinc-800 border-zinc-700 text-white rounded-xl h-12 flex-1 font-mono text-xs" readOnly />
                             </div>
                           </div>
                         </div>
                         <div className="space-y-2">
                           <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Tone of Voice (AI Prompt)</label>
                           <Textarea 
                             value={newBrandKit.toneOfVoice} 
                             onChange={e => setNewBrandKit({...newBrandKit, toneOfVoice: e.target.value})} 
                             className="bg-zinc-800 border-zinc-700 text-white rounded-xl resize-none text-xs"
                             rows={3}
                           />
                         </div>
                         <Button onClick={handleCreateBrandKit} className="w-full bg-white text-zinc-900 hover:bg-zinc-100 h-14 rounded-2xl font-semibold text-sm shadow-md transition-all">
                           Generate Kit <Plus size={16} className="ml-2" />
                         </Button>
                       </CardContent>
                    </Card>

                    {/* Existing Kits */}
                    <div className="space-y-6">
                      {brandKits.length === 0 ? (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-[2.5rem] bg-zinc-50 p-8 text-center flex-col">
                          <Layers size={40} className="text-zinc-300 mb-4" />
                          <p className="font-bold text-zinc-500 uppercase tracking-widest text-xs">No Brand DNA Profiles Found.</p>
                        </div>
                      ) : (
                        brandKits.map(kit => (
                          <Card key={kit.id} className="rounded-[2.5rem] border-zinc-100 shadow-sm overflow-hidden group">
                             <div className="h-16 flex w-full">
                                <div className="flex-1" style={{ backgroundColor: kit.primaryColor }} />
                                <div className="flex-1" style={{ backgroundColor: kit.secondaryColor }} />
                             </div>
                             <CardContent className="p-6">
                               <h3 className="font-semibold text-lg tracking-tight">{kit.name}</h3>
                               <p className="text-sm text-zinc-500 mt-2 line-clamp-2"><span className="font-medium text-zinc-900 mr-2">Tone:</span>{kit.toneOfVoice}</p>
                             </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                 </div>
              </motion.div>
            )}

            {/* TAB: NEURAL SCRIPTWRITER */}
            {activeTab === 'scriptWriter' && (
              <motion.div 
                key="scriptWriter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 flex flex-col h-[calc(100vh-200px)]"
              >
                 <div>
                   <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                      <PenTool size={24} /> Neural Scriptwriter
                   </h2>
                   <p className="text-zinc-500 font-medium">Generate high-converting scripts optimized for retention.</p>
                 </div>

                 <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                    <Card className="rounded-[2.5rem] border-zinc-100 shadow-sm overflow-hidden flex flex-col h-full">
                       <CardHeader className="bg-zinc-50 p-6 border-b border-zinc-100">
                         <CardTitle className="text-xs font-semibold uppercase tracking-tight text-zinc-500 flex items-center justify-between">
                            Parameters <Settings size={16} className="text-zinc-400" />
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="p-6 pt-6 flex-1 flex flex-col space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Brand Kit Context</label>
                               <select 
                                 className="w-full bg-zinc-50 border-zinc-200 text-sm rounded-xl h-10 px-3"
                                 value={selectedBrandKitId}
                                 onChange={(e) => setSelectedBrandKitId(e.target.value)}
                               >
                                 <option value="">None (Generic)</option>
                                 {brandKits.map(b => (
                                   <option key={b.id} value={b.id}>{b.name}</option>
                                 ))}
                               </select>
                             </div>
                             <div className="space-y-2">
                               <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Character Context</label>
                               <select 
                                 className="w-full bg-zinc-50 border-zinc-200 text-sm rounded-xl h-10 px-3"
                                 value={selectedCharacterId}
                                 onChange={(e) => setSelectedCharacterId(e.target.value)}
                               >
                                 <option value="">None (Generic)</option>
                                 {characters.map(c => (
                                 <option key={c.id} value={c.id}>{c.name}</option>
                                 ))}
                               </select>
                             </div>
                          </div>
                          
                          <div className="space-y-2 flex-1">
                            <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Context & Product</label>
                            <Textarea 
                               placeholder="e.g. A new caffeinated sparkling water targeting tired college students..."
                               className="rounded-2xl border-zinc-200 resize-none h-full focus:ring-zinc-900 min-h-[150px]"
                               value={scriptPrompt}
                               onChange={(e) => setScriptPrompt(e.target.value)}
                            />
                          </div>
                          
                          <Button 
                            onClick={handleGenerateScript} 
                            disabled={!scriptPrompt || isGeneratingScript}
                            className="w-full h-16 rounded-3xl bg-zinc-900 text-white font-semibold text-sm tracking-tight border-2 border-zinc-900 hover:bg-white hover:text-zinc-900 shadow-md transition-all"
                          >
                            {isGeneratingScript ? (
                              <><Loader2 className="animate-spin mr-2" /> Initializing LLM...</>
                            ) : (
                              <><Wand2 size={16} className="mr-2" /> Formulate Script</>
                            )}
                          </Button>
                       </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-2 border-dashed border-zinc-200 shadow-none overflow-hidden bg-zinc-50/50 flex flex-col h-full">
                       <CardHeader className="p-6 border-b border-zinc-100/50">
                         <CardTitle className="text-xs font-semibold uppercase tracking-tight text-zinc-500 flex items-center gap-2">
                           Generated Artifact <Sparkles size={16} className="text-orange-500" />
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="p-6 flex-1 overflow-y-auto">
                          {generatedScript ? (
                            <div className="prose prose-sm prose-zinc max-w-none text-zinc-700">
                               <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                                  {generatedScript}
                               </div>
                            </div>
                          ) : (
                             <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                               <PenTool size={48} className="mb-4 opacity-50" />
                               <p className="font-semibold uppercase tracking-tight text-xs text-zinc-400">Awaiting Instructions</p>
                             </div>
                          )}
                       </CardContent>
                       {generatedScript && (
                         <div className="p-6 border-t border-zinc-100/50 bg-white">
                           <Button className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20">
                             Send to Video Pipeline <ArrowRight size={14} className="ml-2" />
                           </Button>
                         </div>
                       )}
                    </Card>
                 </div>
              </motion.div>
            )}

            {/* TAB: CAMPAIGNS */}
            {activeTab === 'campaigns' && (
              <motion.div 
                key="campaigns"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                 <div className="flex justify-between items-end">
                   <div>
                     <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                        <Megaphone size={24} /> A/B Campaign Builder
                     </h2>
                     <p className="text-zinc-500 font-medium tracking-tight">Deploy ultra-scalable multi-variant campaigns.</p>
                   </div>
                   <Button onClick={async () => {
                     const name = prompt("Enter Campaign Name (e.g. Summer Sale):");
                     if (!name || !user) return;
                     const cData = {
                         name,
                         goal: 'Conversions',
                         status: 'active',
                         budget: 5000,
                         impressions: 0,
                         clicks: 0,
                         conversions: 0,
                         creatorId: user.uid,
                         createdAt: serverTimestamp()
                     };
                     try {
                         const docRef = await addDoc(collection(db, 'campaigns'), cData);
                         setCampaigns([{ id: docRef.id, ...cData }, ...campaigns]);
                     } catch(e) {
                         console.error(e);
                     }
                   }} className="rounded-full bg-zinc-900 text-white font-medium text-sm">
                      Automate New Campaign <Wand2 size={14} className="ml-2" />
                   </Button>
                 </div>

                 <Card className="rounded-[2.5rem] border-zinc-100 shadow-sm overflow-hidden bg-zinc-50/50">
                    <CardHeader className="p-8">
                       <CardTitle className="text-xl font-semibold tracking-tight">Active Deployments</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6">
                       {campaigns.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center text-zinc-400 bg-white border border-zinc-100 shadow-sm rounded-3xl">
                             <Megaphone size={32} className="mb-4 text-zinc-300" />
                             <p className="font-semibold text-sm tracking-tight text-zinc-500">No active campaigns formulated yet.</p>
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map(c => (
                               <Card key={c.id} className="rounded-3xl border-zinc-100 bg-white group hover:shadow-lg transition-all">
                                  <CardContent className="p-6 space-y-4">
                                     <div className="flex justify-between items-start">
                                        <Badge className="bg-zinc-100 text-zinc-600 font-medium uppercase text-[10px] tracking-wider border-none">
                                           {c.goal}
                                        </Badge>
                                        <Badge className={`font-medium uppercase text-[10px] tracking-wider border-none ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                           {c.status}
                                        </Badge>
                                     </div>
                                     <div>
                                        <h3 className="font-semibold text-lg tracking-tight line-clamp-1">{c.name}</h3>
                                        <p className="text-sm text-zinc-500 mt-1 font-mono">${c.budget}</p>
                                     </div>
                                     <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-zinc-100 mb-2">
                                        <div className="text-center">
                                           <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Impr</p>
                                           <p className="font-semibold text-sm text-zinc-900">{c.impressions?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="text-center border-l border-zinc-100">
                                           <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Clicks</p>
                                           <p className="font-semibold text-sm text-zinc-900">{c.clicks?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="text-center border-l border-zinc-100">
                                           <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Conv</p>
                                           <p className="font-semibold text-sm text-zinc-900">{c.conversions?.toLocaleString() || 0}</p>
                                        </div>
                                     </div>
                                     <div className="pt-2 flex justify-between items-center text-xs text-zinc-500 font-medium">
                                        <span>3 Variants Active</span>
                                        <Button variant="ghost" size="sm" className="h-8 group-hover:text-zinc-900 group-hover:bg-zinc-100 rounded-lg">View Stats</Button>
                                     </div>
                                  </CardContent>
                               </Card>
                            ))}
                          </div>
                       )}
                    </CardContent>
                 </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
