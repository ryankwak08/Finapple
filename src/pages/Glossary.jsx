import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronRight, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PullToRefresh from '../components/PullToRefresh';
import { getTermsByConsonant, searchTerms, koreanLetters, getInitialConsonant, allGlossaryTerms } from '../lib/glossaryData';

const englishLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

const getEnglishInitial = (str) => {
  if (!str || str.length === 0) return '';
  const firstChar = str[0].toUpperCase();
  return /^[A-Z]$/.test(firstChar) ? firstChar : '';
};

export default function Glossary() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('korean'); // 'korean' | 'english' | 'all'
  const [selectedLetter, setSelectedLetter] = useState('ㄱ');
  const [selectedEnglishLetter, setSelectedEnglishLetter] = useState('B');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  useEffect(() => {
    setCheckingPremium(false);
  }, []);

  const englishTerms = allGlossaryTerms.filter(t => /^[A-Za-z]/.test(t.term));

  const displayTerms = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTerms(searchQuery.trim());
    }
    if (mode === 'all') return allGlossaryTerms;
    if (mode === 'english') {
      return allGlossaryTerms.filter(t =>
        /^[A-Za-z]/.test(t.term) && getEnglishInitial(t.term) === selectedEnglishLetter
      );
    }
    return getTermsByConsonant(selectedLetter);
  }, [mode, selectedLetter, selectedEnglishLetter, searchQuery]);

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 800));
  };



  if (selectedTerm) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 pt-6 pb-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedTerm(null)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180 text-muted-foreground" />
          </button>
          <h1 className="font-bold text-foreground text-lg">용어 상세</h1>
        </div>

        <div className="px-4 pb-8">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">{getInitialConsonant(selectedTerm.term)}</span>
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg leading-snug">{selectedTerm.term}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">한국은행 경제금융용어 800선</p>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-xl p-4">
              <p className="text-foreground text-[14px] leading-relaxed">{selectedTerm.definition}</p>
            </div>

            {selectedTerm.related && selectedTerm.related.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground font-medium mb-2">🔗 연관 검색어</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTerm.related.map((r, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="font-extrabold text-foreground text-2xl">📚 경제 용어 사전</h1>
          <p className="text-muted-foreground text-[13px] mt-1">한국은행 경제금융용어 800선 수록</p>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="용어 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Mode tabs */}
        {!searchQuery && (
          <div className="px-4 mb-3 flex gap-2">
            <button
              onClick={() => setMode('korean')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                mode === 'korean' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'
              }`}
            >
              가나다
            </button>
            <button
              onClick={() => setMode('english')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                mode === 'english' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'
              }`}
            >
              ABC
            </button>
            <button
              onClick={() => setMode('all')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold flex items-center gap-1.5 transition-all ${
                mode === 'all' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              전체 보기
            </button>
          </div>
        )}

        {/* Korean consonant tabs */}
        {!searchQuery && mode === 'korean' && (
          <div className="px-4 mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {koreanLetters.map(letter => {
                const count = getTermsByConsonant(letter).length;
                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedLetter(letter)}
                    disabled={count === 0}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl font-bold text-sm transition-all duration-200 ${
                      selectedLetter === letter
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : count === 0
                        ? 'bg-muted/30 text-muted-foreground/30'
                        : 'bg-card border border-border text-foreground hover:border-primary/30'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* English letter tabs */}
        {!searchQuery && mode === 'english' && (
          <div className="px-4 mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {englishLetters.map(letter => {
                const count = englishTerms.filter(t => getEnglishInitial(t.term) === letter).length;
                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedEnglishLetter(letter)}
                    disabled={count === 0}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl font-bold text-sm transition-all duration-200 ${
                      selectedEnglishLetter === letter
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : count === 0
                        ? 'bg-muted/30 text-muted-foreground/30'
                        : 'bg-card border border-border text-foreground hover:border-primary/30'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Term count */}
        <div className="px-4 mb-2">
          <p className="text-xs text-muted-foreground">
            {searchQuery
              ? `검색 결과 ${displayTerms.length}개`
              : mode === 'all'
              ? `전체 ${displayTerms.length}개`
              : mode === 'english'
              ? `'${selectedEnglishLetter}' 항목 ${displayTerms.length}개`
              : `'${selectedLetter}' 항목 ${displayTerms.length}개`}
          </p>
        </div>

        {/* Terms list */}
        <div className="px-4 pb-8 space-y-2">
          {displayTerms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? '검색 결과가 없습니다' : '해당 항목이 없습니다'}
              </p>
            </div>
          ) : (
            displayTerms.map(term => (
              <button
                key={term.id}
                onClick={() => setSelectedTerm(term)}
                className="w-full text-left bg-card rounded-2xl border border-border p-4 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-[14px] leading-snug">{term.term}</h3>
                    <p className="text-muted-foreground text-[12px] mt-1 line-clamp-2 leading-relaxed">
                      {term.definition}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </div>
                {term.related && term.related.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {term.related.slice(0, 2).map((r, i) => (
                      <span key={i} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">
                        {r}
                      </span>
                    ))}
                    {term.related.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{term.related.length - 2}</span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}