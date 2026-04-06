import { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronRight, List } from 'lucide-react';
import PullToRefresh from '../components/PullToRefresh';
import { getTermsByConsonant, searchTerms, koreanLetters, getInitialConsonant, allGlossaryTerms } from '../lib/glossaryData';

const englishLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

const getEnglishInitial = (str) => {
  if (!str || str.length === 0) return '';
  const firstChar = str[0].toUpperCase();
  return /^[A-Z]$/.test(firstChar) ? firstChar : '';
};

export default function Glossary() {
  const [mode, setMode] = useState('korean'); // 'korean' | 'english' | 'all'
  const [selectedLetter, setSelectedLetter] = useState('ㄱ');
  const [selectedEnglishLetter, setSelectedEnglishLetter] = useState('B');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(null);

  useEffect(() => {
    const handleTabReset = (event) => {
      if (event.detail?.tabRoot !== '/glossary') return;
      setMode('korean');
      setSelectedLetter('ㄱ');
      setSelectedEnglishLetter('B');
      setSearchQuery('');
      setSelectedTerm(null);
    };

    window.addEventListener('bottomNavReset', handleTabReset);
    return () => window.removeEventListener('bottomNavReset', handleTabReset);
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
        <div className="px-4 pb-8 pt-6 xl:px-0">
          <div className="mb-4 flex items-center gap-3 xl:hidden">
            <button
              onClick={() => setSelectedTerm(null)}
              className="rounded-xl p-2 transition-colors hover:bg-muted"
            >
              <ChevronRight className="w-5 h-5 rotate-180 text-muted-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">용어 상세</h1>
          </div>

          <div className="hidden xl:grid xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:gap-6">
            <aside className="rounded-3xl border border-border bg-card/80 p-4">
              <div className="mb-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary/80">Glossary Browser</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  현재 선택된 용어를 오른쪽에서 자세히 볼 수 있어요.
                </p>
              </div>

              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="용어 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                />
                {searchQuery ? (
                  <button onClick={() => setSearchQuery('')}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                ) : null}
              </div>

              <div className="mb-3 flex min-w-max gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setMode('korean')}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                    mode === 'korean' ? 'bg-primary text-white' : 'bg-background border border-border text-foreground'
                  }`}
                >
                  가나다
                </button>
                <button
                  onClick={() => setMode('english')}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                    mode === 'english' ? 'bg-primary text-white' : 'bg-background border border-border text-foreground'
                  }`}
                >
                  ABC
                </button>
                <button
                  onClick={() => setMode('all')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                    mode === 'all' ? 'bg-primary text-white' : 'bg-background border border-border text-foreground'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  전체
                </button>
              </div>

              {!searchQuery && mode === 'korean' ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {koreanLetters.map(letter => {
                    const count = getTermsByConsonant(letter).length;
                    return (
                      <button
                        key={letter}
                        onClick={() => setSelectedLetter(letter)}
                        disabled={count === 0}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                          selectedLetter === letter
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : count === 0
                            ? 'bg-muted/30 text-muted-foreground/30'
                            : 'bg-background border border-border text-foreground hover:border-primary/30'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {!searchQuery && mode === 'english' ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {englishLetters.map(letter => {
                    const count = englishTerms.filter(t => getEnglishInitial(t.term) === letter).length;
                    return (
                      <button
                        key={letter}
                        onClick={() => setSelectedEnglishLetter(letter)}
                        disabled={count === 0}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                          selectedEnglishLetter === letter
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : count === 0
                            ? 'bg-muted/30 text-muted-foreground/30'
                            : 'bg-background border border-border text-foreground hover:border-primary/30'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <p className="mb-3 text-xs text-muted-foreground">
                {searchQuery
                  ? `검색 결과 ${displayTerms.length}개`
                  : mode === 'all'
                  ? `전체 ${displayTerms.length}개`
                  : mode === 'english'
                  ? `'${selectedEnglishLetter}' 항목 ${displayTerms.length}개`
                  : `'${selectedLetter}' 항목 ${displayTerms.length}개`}
              </p>

              <div className="space-y-2 overflow-y-auto pr-1 xl:max-h-[calc(100dvh-260px)]">
                {displayTerms.map(term => (
                  <button
                    key={term.id}
                    onClick={() => setSelectedTerm(term)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      selectedTerm.id === term.id
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-border bg-background hover:shadow-sm'
                    }`}
                  >
                    <h3 className="text-[14px] font-bold leading-snug text-foreground">{term.term}</h3>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                      {term.definition}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-3xl border border-border bg-card p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="text-base font-bold text-primary">{getInitialConsonant(selectedTerm.term)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary/80">Term Detail</p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-snug text-foreground">{selectedTerm.term}</h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">한국은행 경제금융용어 800선</p>
                </div>
              </div>

              <div className="rounded-2xl bg-secondary/30 p-5">
                <p className="text-[15px] leading-8 text-foreground">{selectedTerm.definition}</p>
              </div>

              {selectedTerm.related && selectedTerm.related.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">연관 검색어</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTerm.related.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const relatedTerm = allGlossaryTerms.find((term) => term.term === r);
                          if (relatedTerm) {
                            setSelectedTerm(relatedTerm);
                          } else {
                            setSearchQuery(r);
                          }
                        }}
                        className="rounded-full bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/15"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div className="px-4 pb-8 xl:hidden">
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
        <div className="px-4 pb-4 pt-6">
          <h1 className="text-[26px] font-extrabold text-foreground sm:text-3xl">📚 경제 용어 사전</h1>
          <p className="text-muted-foreground text-[13px] mt-1">한국은행 경제금융용어 800선 수록</p>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3">
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
          <div className="mb-3 overflow-x-auto px-4">
            <div className="flex min-w-max gap-2 pb-1">
            <button
              onClick={() => setMode('korean')}
              className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                mode === 'korean' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'
              }`}
            >
              가나다
            </button>
            <button
              onClick={() => setMode('english')}
              className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                mode === 'english' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'
              }`}
            >
              ABC
            </button>
            <button
              onClick={() => setMode('all')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                mode === 'all' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              전체 보기
            </button>
            </div>
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
        <div className="grid gap-2 px-4 pb-8 md:grid-cols-2 2xl:grid-cols-3">
          {displayTerms.length === 0 ? (
            <div className="py-12 text-center md:col-span-2 2xl:col-span-3">
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
                className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 active:scale-[0.98] hover:shadow-md hover:shadow-primary/5"
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
