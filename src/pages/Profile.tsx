import { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, Timestamp, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Wallet, Settings, LayoutGrid, History } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContentItem {
  id: string;
  title: string;
  imageUrl: string;
  moderationStatus: string;
  isMonetized: boolean;
  price: number;
}

interface TransactionItem {
  id: string;
  amount: number;
  contentId: string;
  createdAt: Timestamp;
}

export default function Profile() {
  const { user } = useAuth();
  const [creations, setCreations] = useState<ContentItem[]>([]);
  const [sales, setSales] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // My Creations
        const cq = query(collection(db, 'content'), where('creatorId', '==', user.uid));
        const cSnap = await getDocs(cq);
        setCreations(cSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ContentItem[]);

        // My Sales (where I am the seller)
        const sq = query(collection(db, 'transactions'), where('sellerId', '==', user.uid));
        const sSnap = await getDocs(sq);
        setSales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })) as TransactionItem[]);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'profile_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) return <div className="py-20 text-center">Please sign in to view your profile.</div>;

  const totalEarnings = sales.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm">
        <Avatar className="h-32 w-32 border-4 border-white shadow-xl shadow-zinc-200">
          <AvatarImage src={user.photoURL || ''} />
          <AvatarFallback className="text-3xl font-bold bg-zinc-900 text-white">
            {user.displayName?.charAt(0) || user.email?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">{user.displayName || "User"}</h1>
          <p className="text-zinc-500 font-medium">{user.email}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
             <Badge className="bg-zinc-100 text-zinc-600 border-none font-mono px-3 py-1">
               UID: {user.uid.substring(0, 8)}
             </Badge>
             <Badge className="bg-blue-100 text-blue-700 border-none font-mono px-3 py-1">
               Tier: Certified Creator
             </Badge>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-zinc-100 md:pl-12">
           <p className="text-xs font-semibold uppercase tracking-tight text-zinc-500">Net Revenue</p>
           <p className="text-4xl md:text-5xl font-semibold text-zinc-900 tracking-tight">${totalEarnings.toFixed(2)}</p>
           <div className="flex gap-2">
             <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full uppercase tracking-tight flex items-center gap-1">
               <History size={10} /> +12.5% this week
             </div>
           </div>
        </div>
      </div>

      <Tabs defaultValue="creations" className="space-y-8">
        <div className="flex items-center justify-between">
          <TabsList className="bg-zinc-100 p-1 rounded-2xl">
            <TabsTrigger value="creations" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutGrid size={16} className="mr-2" /> My Portfolio
            </TabsTrigger>
            <TabsTrigger value="sales" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <History size={16} className="mr-2" /> Transaction History
            </TabsTrigger>
          </TabsList>
          
          <div className="hidden md:flex gap-2">
             <Button variant="outline" size="icon" className="rounded-xl"><Settings size={18} /></Button>
             <Button variant="outline" size="icon" className="rounded-xl"><Wallet size={18} /></Button>
          </div>
        </div>

        <TabsContent value="creations" className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-zinc-200 animate-pulse rounded-3xl" />)
            ) : creations.length > 0 ? (
              creations.map(item => (
                <Link key={item.id} to={`/content/${item.id}`}>
                  <Card className="overflow-hidden rounded-[2rem] border-zinc-200 group relative">
                    <img src={item.imageUrl} className="aspect-square object-cover" alt={item.title} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Badge className={
                         item.moderationStatus === 'approved' ? 'bg-green-500' : 
                         item.moderationStatus === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                       }>
                         {item.moderationStatus.toUpperCase()}
                       </Badge>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-200 rounded-[2.5rem]">
                <p className="text-zinc-500">Your portfolio is empty. Time to create something!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-0">
          <Card className="rounded-[2.5rem] border-zinc-200 overflow-hidden shadow-sm">
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-zinc-50 text-zinc-500 uppercase text-xs font-semibold tracking-tight border-b border-zinc-100">
                     <tr>
                       <th className="px-8 py-4">Transaction ID</th>
                       <th className="px-8 py-4">Content Ref</th>
                       <th className="px-8 py-4">Date</th>
                       <th className="px-8 py-4 text-right pr-12">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-100">
                     {sales.map(s => (
                       <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                         <td className="px-8 py-5 font-mono text-xs text-zinc-400">#{s.id.substring(0, 12)}</td>
                         <td className="px-8 py-5 font-semibold text-zinc-900">Creation Asset</td>
                         <td className="px-8 py-5 text-zinc-500">{s.createdAt.toDate().toLocaleDateString()}</td>
                         <td className="px-8 py-5 text-right pr-12 font-bold text-zinc-900">+${s.amount.toFixed(2)}</td>
                       </tr>
                     ))}
                     {sales.length === 0 && (
                       <tr>
                         <td colSpan={4} className="px-8 py-20 text-center text-zinc-400 italic">No transactions found.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
