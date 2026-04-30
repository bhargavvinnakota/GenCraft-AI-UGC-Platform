import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, Timestamp, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { 
  Heart, 
  Share2, 
  ArrowLeft,
  Zap,
  DollarSign,
  Loader2
} from 'lucide-react';

interface ContentItem {
  id: string;
  creatorId: string;
  characterId?: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  type: 'image' | 'video';
  workflow?: string;
  prompt: string;
  price: number;
  isMonetized: boolean;
  likes: string[];
  createdAt: Timestamp;
  analysis?: string;
  metadata?: {
    engine: string;
    sampler: string;
    steps: number;
    cfg: number;
    seed: number;
  };
}

export default function ContentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, 'content', id);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setContent({ id: snapshot.id, ...snapshot.data() } as ContentItem);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `content/${id}`);
    });
    return () => unsubscribe();
  }, [id]);

  const toggleLike = async () => {
    if (!user || !content) return;
    const docRef = doc(db, 'content', content.id);
    const hasLiked = content.likes.includes(user.uid);
    try {
      await updateDoc(docRef, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `content/${content.id}`);
    }
  };

  if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!content) return <div className="py-20 text-center">Neural asset not found.</div>;

  const hasLiked = user ? content.likes.includes(user.uid) : false;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 py-8">
      <div className="lg:col-span-1 border-r border-zinc-200 hidden lg:block">
        <div className="sticky top-24 space-y-8 py-4">
           <div className="writing-mode-vertical text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300 transform rotate-180 flex items-center gap-4">
             GEN-CRAFT NEURAL LOGS // {content.id.toUpperCase()}
           </div>
        </div>
      </div>

      <div className="lg:col-span-11 grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Left: Viewport */}
        <section className="space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-600 mb-4 h-10 rounded-xl px-4">
            <ArrowLeft size={16} className="mr-2" /> Back to Discover
          </Button>

          <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl relative group">
             <img src={content.imageUrl} alt={content.title} className="w-full h-full object-cover" />
             {content.type === 'video' && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                     <Zap size={32} className="text-white fill-current" />
                   </div>
                </div>
             )}
          </div>
          
          <div className="grid grid-cols-4 gap-4">
             {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-zinc-100 overflow-hidden border-2 border-white shadow-sm opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                  <img src={content.imageUrl} alt="Variant" className="w-full h-full object-cover" />
                </div>
             ))}
          </div>
        </section>

        {/* Right: Technical Specs & Intel */}
        <section className="space-y-10">
          <header className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge className="bg-zinc-900 text-white rounded-full px-4 py-1 text-xs font-semibold tracking-tight border-none">
                {content.workflow?.replace('-', ' ') || 'Ultra HD Pipeline'}
              </Badge>
              {content.type === 'video' && (
                 <Badge className="bg-orange-500 text-white rounded-full px-4 py-1 text-xs font-semibold tracking-tight border-none">
                   AI Lip-Sync Pre-rendered
                 </Badge>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight">
              {content.title}
            </h1>

            <div className="flex items-center gap-6 py-4 border-y border-zinc-100">
               <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-zinc-100">
                    <AvatarFallback className="bg-zinc-900 text-white text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Authored by</p>
                    <p className="text-sm font-semibold truncate max-w-[150px] text-zinc-900">Creator #{content.creatorId.substring(0,6)}</p>
                  </div>
               </div>
               <div className="h-8 w-[1px] bg-zinc-100" />
               <div>
                  <p className="text-xs font-semibold uppercase tracking-tight text-zinc-500">License</p>
                  <p className="text-sm font-semibold text-zinc-900">Commercial Pro</p>
               </div>
            </div>
          </header>

          <div className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={toggleLike}
                variant={hasLiked ? "default" : "outline"}
                className={`flex-1 rounded-2xl h-14 font-semibold text-sm transition-all ${hasLiked ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                disabled={!user}
              >
                <Heart size={18} className={`mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                {content.likes.length} Verifications
              </Button>
              <Button variant="outline" className="h-14 w-14 rounded-2xl p-0">
                <Share2 size={20} />
              </Button>
            </div>

            <Button className="w-full h-16 rounded-[2rem] bg-zinc-900 text-white text-base font-semibold tracking-tight hover:bg-zinc-800 transition-all shadow-md group">
              Acquire Neural Rights <DollarSign size={20} className="ml-2 group-hover:scale-110 transition-transform" />
            </Button>
          </div>

          <div className="space-y-4">
             <h3 className="text-xs font-semibold tracking-tight text-zinc-900 uppercase">Neural Metadata</h3>
             <Card className="rounded-3xl border-zinc-100 shadow-sm bg-zinc-50/50 p-6">
                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                   <div>
                     <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tight mb-1 font-mono">Engine</p>
                     <p className="text-xs font-mono font-medium text-zinc-900">{content.metadata?.engine || 'GenCraft Neural V3'}</p>
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tight mb-1 font-mono">Sampler</p>
                     <p className="text-xs font-mono font-medium text-zinc-900">{content.metadata?.sampler || 'DPM++ 2M Karras'}</p>
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tight mb-1 font-mono">Steps</p>
                     <p className="text-xs font-mono font-medium text-zinc-900">{content.metadata?.steps || 45}</p>
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-zinc-500 uppercase tracking-tight mb-1 font-mono">Seed</p>
                     <p className="text-xs font-mono font-medium text-zinc-900">{content.metadata?.seed || content.id.substring(0,8)}</p>
                   </div>
                </div>
             </Card>
          </div>

          <div className="space-y-4">
             <h3 className="text-xs font-semibold tracking-tight text-zinc-900 uppercase">Anatomical Fidelity Log</h3>
             <div className="text-xs text-zinc-600 leading-relaxed italic border-l-2 border-zinc-900 pl-6 py-3 bg-zinc-50 rounded-r-2xl max-h-[200px] overflow-y-auto">
                {content.analysis || "Neural verification in progress..."}
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
