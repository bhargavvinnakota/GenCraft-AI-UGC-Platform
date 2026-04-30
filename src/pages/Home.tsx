import { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, OperationType, handleFirestoreError } from '../lib/firebase';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Sparkles, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

interface ContentItem {
  id: string;
  creatorId: string;
  characterId?: string;
  title: string;
  imageUrl: string;
  videoUrl?: string;
  type?: 'image' | 'video';
  price: number;
  isMonetized: boolean;
  likes: string[];
  workflow?: string;
}

export default function Home() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'content'),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContent(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContentItem[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'content');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[3rem] bg-zinc-900 px-8 py-24 text-center text-white">
        {/* Soft elegant blur backgrounds instead of carbon-fibre */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px]" />
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-500/20 blur-[100px]" />
        </div>
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
           className="relative z-10 space-y-6"
        >
          <Badge className="bg-white/10 hover:bg-white/15 text-white rounded-full px-5 py-1.5 border border-white/10 backdrop-blur-md shadow-sm transition-colors text-xs font-medium">
            <Sparkles size={14} className="mr-2 text-zinc-300" /> Neural V3 Engine Active
          </Badge>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Hyper Realistic <br /> Experience.
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg md:text-xl font-normal tracking-tight">
            GenCraft delivers 100% natural skin tones and minute anatomical details. 
            The world's first platform optimized for cinematic consistency.
          </p>
        </motion.div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-zinc-100 animate-pulse rounded-[2.5rem]" />
          ))
        ) : content.length > 0 ? (
          content.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <Link to={`/content/${item.id}`}>
                <Card className="rounded-[2.5rem] overflow-hidden border border-zinc-200/50 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 bg-white">
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {item.type === 'video' && (
                        <Badge className="bg-orange-500 text-white rounded-full px-3 py-1 border-none text-xs font-semibold tracking-tight uppercase">
                          Lip-Sync Active
                        </Badge>
                      )}
                      <Badge className="bg-white/90 backdrop-blur-md text-black rounded-full px-3 py-1 border-none text-xs font-semibold tracking-tight uppercase">
                        {item.workflow?.replace('-', ' ') || 'Ultra HD'}
                      </Badge>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                      <h3 className="text-white text-xl font-semibold truncate tracking-tight">{item.title || "V-human Creation"}</h3>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border-2 border-white/20">
                            <AvatarFallback className="bg-zinc-800 text-[10px] text-white">GC</AvatarFallback>
                          </Avatar>
                          <p className="text-white/80 text-xs font-medium tracking-tight">Neural Seed: {item.id.substring(0,6)}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                           <Heart size={16} className={`text-white ${item.likes.length > 0 ? 'fill-white' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 rounded-[3rem]">
            <p className="text-zinc-400 italic">No neural assets indexed yet. Begin your first workflow?</p>
          </div>
        )}
      </div>
    </div>
  );
}
