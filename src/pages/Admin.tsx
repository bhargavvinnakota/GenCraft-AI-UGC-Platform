import { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, updateDoc, doc, serverTimestamp, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Check, X, ShieldAlert, Loader2 } from 'lucide-react';

interface PendingContent {
  id: string;
  title: string;
  imageUrl: string;
  creatorId: string;
  description: string;
  price: number;
}

export default function Admin() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const fetchPending = async () => {
      const q = query(collection(db, 'content'), where('moderationStatus', '==', 'pending'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PendingContent[];
      setPending(items);
      setLoading(false);
    };

    fetchPending();
  }, [user]);

  const handleModeration = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const docRef = doc(db, 'content', id);
      await updateDoc(docRef, {
        moderationStatus: status,
        updatedAt: serverTimestamp(),
        moderatedBy: user?.uid,
      });
      setPending(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `content/${id}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-zinc-500">Only platform administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moderation Queue</h1>
          <p className="text-zinc-500">Review submitted content to maintain platform safety.</p>
        </div>
        <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 font-mono">
          {pending.length} Pending Items
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-zinc-300" size={48} />
          </div>
        ) : pending.length > 0 ? (
          pending.map(item => (
            <Card key={item.id} className="overflow-hidden border-zinc-200">
              <div className="aspect-video bg-zinc-100 flex items-center justify-center relative group">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
              </div>
              <CardHeader className="py-4">
                <CardTitle className="text-lg truncate">{item.title || "Untitled Creation"}</CardTitle>
                <p className="text-sm text-zinc-500 line-clamp-2">{item.description}</p>
              </CardHeader>
              <CardContent className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
                <div className="text-xs font-mono text-zinc-400">
                  ID: {item.id.substring(0, 8)} | User: {item.creatorId.substring(0, 6)}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="h-8"
                    onClick={() => handleModeration(item.id, 'rejected')}
                    disabled={processingId === item.id}
                  >
                    {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} className="mr-1" />}
                    Reject
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 bg-green-600 hover:bg-green-700"
                    onClick={() => handleModeration(item.id, 'approved')}
                    disabled={processingId === item.id}
                  >
                    {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="mr-1" />}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
            <h3 className="text-lg font-semibold text-zinc-900">Queue is Clear</h3>
            <p className="text-zinc-500">All submissions have been processed. Great job!</p>
          </div>
        )}
      </div>
    </div>
  );
}
