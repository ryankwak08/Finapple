import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, BookMarked, ShoppingBag, Medal } from 'lucide-react';

export const appTabs = [
  { root: '/', label: '학습', icon: BookOpen },
  { root: '/quiz', label: '퀴즈', icon: Trophy },
  { root: '/leaderboard', label: '리그', icon: Medal },
  { root: '/glossary', label: '용어사전', icon: BookMarked },
  { root: '/shop', label: '상점', icon: ShoppingBag },
];

export function getActiveTab(pathname) {
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
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-card/88 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-1 pt-2">
        {appTabs.map(({ root, label, icon: Icon }) => {
          const active = activeTab === root;
          return (
            <button
              key={root}
              onClick={() => handleTabPress(root)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-200 outline-none select-none ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className={`rounded-2xl p-1.5 transition-all duration-200 ${active ? 'bg-primary/10 shadow-sm shadow-primary/10' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] leading-none sm:text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
