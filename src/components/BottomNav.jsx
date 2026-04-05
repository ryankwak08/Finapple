import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, BookMarked, ShoppingBag, Medal } from 'lucide-react';

const tabs = [
  { root: '/', label: '학습', icon: BookOpen },
  { root: '/quiz', label: '퀴즈', icon: Trophy },
  { root: '/leaderboard', label: '리그', icon: Medal },
  { root: '/glossary', label: '용어사전', icon: BookMarked },
  { root: '/shop', label: '상점', icon: ShoppingBag },
];

function getActiveTab(pathname) {
  if (pathname.startsWith('/quiz')) return '/quiz';
  if (pathname.startsWith('/leaderboard')) return '/leaderboard';
  if (pathname.startsWith('/glossary')) return '/glossary';
  if (pathname.startsWith('/shop')) return '/shop';
  return '/';
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(pathname);

  const handleTabPress = (tabRoot) => {
    window.dispatchEvent(new CustomEvent('bottomNavReset', { detail: { tabRoot } }));
    navigate(tabRoot);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ root, label, icon: Icon }) => {
          const active = activeTab === root;
          return (
            <button
              key={root}
              onClick={() => handleTabPress(root)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-all duration-200 outline-none select-none ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${active ? 'bg-primary/10' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
