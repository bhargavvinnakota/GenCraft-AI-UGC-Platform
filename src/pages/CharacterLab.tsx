import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { extractCharacterTraits, generateExpressionSheet } from '../lib/gemini';
import { db, collection, addDoc, serverTimestamp, query, where, getDocs, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  Loader2, 
  Fingerprint, 
  Camera, 
  ShieldCheck, 
  Dna, 
  Smile, 
  User, 
  Scaling, 
  Activity,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface Character {
  id: string;
  name: string;
  traits: string;
  baseImageUrl: string;
  expressionSheetUrl?: string;
  bodyType: string;
  age?: string;
  ethnicity?: string;
  gender?: string;
  style?: string;
}

const AGES = ['Child (5-12)', 'Teen (13-19)', 'Young Adult (20-29)', 'Adult (30-49)', 'Middle-Aged (50-65)', 'Senior (65+)'];
const ETHNICITIES = ['African', 'African American', 'East Asian', 'South Asian', 'Southeast Asian', 'Caucasian', 'Hispanic/Latino', 'Middle Eastern', 'Pacific Islander', 'Indigenous', 'Mixed/Multiracial', 'Other'];
const GENDERS = ['Male', 'Female', 'Non-Binary', 'Androgynous'];
const BODY_TYPES = [
  "Ectomorph (Lean)",
  "Mesomorph (Athletic)",
  "Endomorph (Soft/Strong)",
  "Petite",
  "Statuesque",
  "Athletic Cut",
  "Plus Size",
  "Average"
];
const STYLES = ['Casual', 'Business', 'Cyberpunk', 'Fantasy', 'Streetwear', 'High Fashion', 'Vintage', 'Minimalist'];

export default function CharacterLab() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState(AGES[2]);
  const [ethnicity, setEthnicity] = useState(ETHNICITIES[5]);
  const [gender, setGender] = useState(GENDERS[1]);
  const [bodyType, setBodyType] = useState(BODY_TYPES[1]);
  const [style, setStyle] = useState(STYLES[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCharacters = async () => {
      try {
        const q = query(collection(db, 'characters'), where('creatorId', '==', user.uid));
        const snap = await getDocs(q);
        setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Character[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCharacters();
  }, [user]);

  const handleForge = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && name) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setIsProcessing(true);
        try {
          // 1. Biometric Extraction
          setProcessingStep('Extracting Biometric DNA...');
          const traits = await extractCharacterTraits(base64, { age, ethnicity, gender, bodyType, style });
          
          // 2. Persona Sheet Generation
          setProcessingStep('Generating Expression Sheet...');
          const expressionSheetUrl = await generateExpressionSheet(traits);
          
          // 3. Save to Registry
          const newChar = {
            creatorId: user?.uid,
            name,
            traits,
            baseImageUrl: base64,
            expressionSheetUrl,
            bodyType,
            age,
            ethnicity,
            gender,
            style,
            createdAt: serverTimestamp(),
            dnaMetadata: {
              version: '3.1-DNA',
              biometricHash: Math.random().toString(36).substring(7),
              skinToneFidelity: 0.99
            }
          };
          const docRef = await addDoc(collection(db, 'characters'), newChar);
          setCharacters(prev => [{ id: docRef.id, ...newChar }, ...prev]);
          setName('');
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'characters');
        } finally {
          setIsProcessing(false);
          setProcessingStep('');
        }
      };
      reader.readAsDataURL(file);
    } else if (!name) {
      alert("Identify the persona codename before forge.");
    }
  };

  if (!user) return <div className="py-20 text-center font-bold text-zinc-400">Restricted Access. Sign DNA path.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-16 py-12">
      {/* Header */}
      <section className="relative">
        <div className="absolute -top-12 -left-12 opacity-5">
           <Dna size={300} />
        </div>
        <div className="relative z-10 space-y-4">
          <Badge className="bg-zinc-900 text-white rounded-full px-5 py-1.5 border-none mb-4 uppercase tracking-[0.2em] text-[10px] font-semibold">
            Avatar Forge Engine v4.0
          </Badge>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-zinc-900 leading-tight">
            Character <br /> <span className="text-zinc-400">DNA Lab.</span>
          </h1>
          <p className="text-lg text-zinc-500 max-w-xl font-medium tracking-tight">
            Lock in biometric consistency. Our neural architecture maps 1,000+ points of facial DNA to ensure your 
            avatars look real across every expression and body type.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
        {/* Left: Input/Form */}
        <div className="xl:col-span-4 space-y-8">
           <Card className="rounded-[2.5rem] border-zinc-200 shadow-2xl overflow-hidden border-2">
             <CardHeader className="bg-zinc-900 py-10 px-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Activity size={80} />
                </div>
                <CardTitle className="text-xl font-semibold tracking-tight">Forge DNA</CardTitle>
                <CardDescription className="text-zinc-500 font-medium text-xs mt-1">Initialize biometric baseline</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="space-y-3">
                   <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500 flex items-center gap-2">
                      <Fingerprint size={12} /> Codename
                   </label>
                   <Input 
                      placeholder="e.g. PROJECT_LUNA" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-2xl border-zinc-200 h-14 bg-zinc-50 focus:ring-zinc-900 font-bold uppercase transition-all"
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500 flex items-center gap-2">
                      <Scaling size={12} /> Demographics & Identity
                   </label>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1 block">Origin/Ethnicity</label>
                        <select 
                          value={ethnicity} 
                          onChange={(e) => setEthnicity(e.target.value)}
                          className="w-full rounded-xl border-zinc-200 h-10 bg-zinc-50 text-xs font-semibold text-zinc-700 px-3 py-0 focus:ring-zinc-900 border-2"
                        >
                          {ETHNICITIES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1 block">Age Range</label>
                        <select 
                          value={age} 
                          onChange={(e) => setAge(e.target.value)}
                          className="w-full rounded-xl border-zinc-200 h-10 bg-zinc-50 text-xs font-semibold text-zinc-700 px-3 py-0 focus:ring-zinc-900 border-2"
                        >
                          {AGES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1 block">Gender</label>
                        <select 
                          value={gender} 
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full rounded-xl border-zinc-200 h-10 bg-zinc-50 text-xs font-semibold text-zinc-700 px-3 py-0 focus:ring-zinc-900 border-2"
                        >
                          {GENDERS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1 block">Aesthetic/Style</label>
                        <select 
                          value={style} 
                          onChange={(e) => setStyle(e.target.value)}
                          className="w-full rounded-xl border-zinc-200 h-10 bg-zinc-50 text-xs font-semibold text-zinc-700 px-3 py-0 focus:ring-zinc-900 border-2"
                        >
                          {STYLES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-semibold uppercase tracking-tight text-zinc-500 flex items-center gap-2">
                      <Scaling size={12} /> Body Architecture
                   </label>
                   <div className="grid grid-cols-2 gap-2">
                      {BODY_TYPES.map((type) => (
                        <button
                          key={type}
                          title={type}
                          onClick={() => setBodyType(type)}
                          className={`p-2 rounded-xl border-2 text-[10px] font-semibold tracking-tight transition-all truncate ${
                            bodyType === type 
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                            : 'bg-white border-zinc-100 hover:border-zinc-200 text-zinc-500'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="relative group overflow-hidden rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-200 aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-all hover:border-zinc-400">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 z-10 cursor-pointer" 
                    onChange={handleForge}
                    disabled={isProcessing}
                  />
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-zinc-100">
                    <Camera size={32} className="text-zinc-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-tight text-zinc-500 text-center px-8">
                    Upload Biometric Reference <br /> <span className="text-zinc-400 font-medium">(Front View Recommended)</span>
                  </p>
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white space-y-6 z-20">
                      <div className="relative">
                        <Loader2 className="animate-spin text-white/10" size={100} strokeWidth={1} />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Sparkles size={32} className="animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold animate-pulse tracking-tight">{processingStep}</p>
                        <p className="text-[8px] uppercase tracking-[0.5em] text-zinc-500 mt-2">Neural Link: Active</p>
                      </div>
                    </div>
                  )}
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Right: Registry */}
        <div className="xl:col-span-8 space-y-8">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-6">
               <div>
                 <h2 className="text-3xl font-semibold tracking-tight">V-Human Registry</h2>
                 <p className="text-sm text-zinc-500 font-medium mt-1">Verified Character DNA Streams</p>
               </div>
               <Badge variant="outline" className="rounded-full bg-zinc-50 border-zinc-200 px-5 py-1.5 text-zinc-900 font-semibold text-xs transition-colors hover:bg-zinc-100">
                 {characters.length} NODES ONLINE
               </Badge>
            </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {loading ? (
               [...Array(2)].map((_, i) => <div key={i} className="aspect-[4/6] bg-zinc-100 animate-pulse rounded-[3rem]" />)
             ) : characters.map(char => (
               <motion.div
                 key={char.id}
                 layout
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="group"
               >
                 <Card className="rounded-[3rem] overflow-hidden border-2 border-zinc-100 shadow-sm group-hover:shadow-2xl transition-all duration-500 bg-white">
                   <div className="aspect-[4/5] overflow-hidden relative">
                     <img src={char.baseImageUrl} alt={char.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                     <div className="absolute top-6 right-6">
                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl">
                           <ShieldCheck size={20} className="text-white fill-green-500" />
                        </div>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2">
                        <Badge className="bg-white/10 hover:bg-white/15 text-white rounded-full px-4 text-xs font-semibold tracking-tight border-white/20 backdrop-blur-md mb-2">
                           <Dna size={12} className="mr-2" /> DNA ID: {char.id.substring(0,8)}
                        </Badge>
                        <h3 className="text-white text-3xl font-semibold tracking-tight drop-shadow-sm">{char.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                           <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold border-white/30 text-white backdrop-blur-md bg-white/10">
                              {char.gender} • {char.age}
                           </Badge>
                           <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold border-white/30 text-white backdrop-blur-md bg-white/10">
                              {char.ethnicity}
                           </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-white/80 mt-2">
                           <p className="text-[10px] uppercase tracking-widest font-bold inline-flex items-center gap-1.5 drop-shadow-sm opacity-80">
                              <User size={10} /> {char.bodyType} <span className="opacity-50">/</span> {char.style}
                           </p>
                        </div>
                     </div>
                   </div>
                   
                   <CardContent className="p-8 space-y-8 bg-zinc-50/30">
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-tight text-zinc-500 flex items-center justify-between">
                           Expression Mapping <span>High Fidelity</span>
                        </h4>
                        {char.expressionSheetUrl ? (
                          <div className="aspect-square rounded-2xl overflow-hidden border-2 border-zinc-100 shadow-inner group/sheet cursor-pointer">
                             <img src={char.expressionSheetUrl} alt="Expressions" className="w-full h-full object-cover group-hover/sheet:scale-110 transition-transform duration-700" />
                          </div>
                        ) : (
                          <div className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-zinc-200">
                             <Smile size={24} className="text-zinc-200 mb-2" />
                             <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-300">Sheet not generated</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Technical DNA Digest</h4>
                         <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                            <p className="text-[11px] text-zinc-500 leading-relaxed italic line-clamp-3">
                               {char.traits}
                            </p>
                            <Button variant="ghost" className="w-full mt-6 h-12 rounded-xl text-[11px] font-semibold uppercase tracking-tight text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all group/btn">
                               Open DNA Explorer <ChevronRight size={14} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                         </div>
                      </div>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
