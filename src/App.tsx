import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Button } from './components/ui/button';
import { 
  Plus, 
  Home as HomeIcon, 
  User as UserIcon, 
  ShieldCheck, 
  Zap, 
  LogOut,
  Wallet,
  LayoutDashboard,
  Megaphone
} from 'lucide-react';
import Home from './pages/Home';
import Create from './pages/Create';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import ContentDetail from './pages/ContentDetail';
import CharacterLab from './pages/CharacterLab';
import MarketingStudio from './pages/MarketingStudio';
import { motion, AnimatePresence } from 'motion/react';

const Header = () => {
  const { user, signIn, logout } = useAuth();

  return (
    <header className="border-b border-zinc-200/40 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900">
          <div className="bg-zinc-900 text-white p-1 rounded-lg">
            <Zap size={20} fill="currentColor" />
          </div>
          GenCraft
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
          <Link to="/" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
            <HomeIcon size={16} /> Home
          </Link>
          {user && (
            <>
              <Link to="/create" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
                <Plus size={16} /> Workflow
              </Link>
              <Link to="/characters" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
                <UserIcon size={16} /> Characters
              </Link>
              <Link to="/marketing" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
                <Megaphone size={16} /> Marketing
              </Link>
              <Link to="/profile" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5">
                <LayoutDashboard size={16} /> Profile
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="hover:text-zinc-900 transition-colors flex items-center gap-1.5 text-orange-600">
                  <ShieldCheck size={16} /> Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-xs font-mono text-zinc-600">
                <Wallet size={12} /> $128.50
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="rounded-full">
                <LogOut size={16} className="mr-2" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={signIn} className="rounded-full px-6">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-zinc-900 selection:text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<Create />} />
            <Route path="/characters" element={<CharacterLab />} />
            <Route path="/marketing" element={<MarketingStudio />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/content/:id" element={<ContentDetail />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}
