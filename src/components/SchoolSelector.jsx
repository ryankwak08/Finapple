import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import { getSchoolDisplayName, normalizeSchoolRecord, searchSchools } from '@/api/schoolClient';

export default function SchoolSelector({
  value,
  onChange,
  compact = false,
  placeholder = '학교명을 검색하세요',
}) {
  const [query, setQuery] = useState(value?.schoolName || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selectedSchool = useMemo(() => normalizeSchoolRecord(value), [value]);

  useEffect(() => {
    if (selectedSchool?.schoolName && query !== selectedSchool.schoolName) {
      setQuery(selectedSchool.schoolName);
    }
  }, [query, selectedSchool]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || selectedSchool?.schoolName === trimmedQuery) {
      setResults([]);
      setError('');
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError('');
      searchSchools(trimmedQuery)
        .then((schools) => {
          if (!cancelled) {
            setResults(schools);
          }
        })
        .catch((searchError) => {
          if (!cancelled) {
            setError(searchError.message || '학교를 검색하지 못했습니다.');
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query, selectedSchool?.schoolName]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#828282]" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (selectedSchool && event.target.value.trim() !== selectedSchool.schoolName) {
              onChange(null);
            }
          }}
          className={`w-full rounded-lg border border-[#E0E0E0] bg-white pl-9 pr-10 text-sm text-black outline-none transition placeholder:text-[#828282] focus:border-black/30 ${compact ? 'h-10' : 'h-11'}`}
          placeholder={placeholder}
          autoComplete="organization"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#828282]" />
        ) : selectedSchool?.schoolCode ? (
          <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
        ) : null}
      </div>

      {selectedSchool?.schoolName ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          선택됨: {getSchoolDisplayName(selectedSchool)}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      ) : null}

      {results.length > 0 ? (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E0E0E0] bg-white shadow-sm">
          {results.map((school) => (
            <button
              key={`${school.educationOfficeCode}-${school.schoolCode}`}
              type="button"
              onClick={() => {
                onChange(school);
                setQuery(school.schoolName);
                setResults([]);
              }}
              className="w-full border-b border-[#F0F0F0] px-3 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
            >
              <p className="text-sm font-semibold text-black">{school.schoolName}</p>
              <p className="mt-0.5 text-xs text-[#707070]">
                {[school.regionName, school.schoolType, school.educationOfficeName].filter(Boolean).join(' · ')}
              </p>
              {school.address ? <p className="mt-0.5 text-[11px] text-[#8A8A8A]">{school.address}</p> : null}
            </button>
          ))}
        </div>
      ) : query.trim().length >= 2 && !loading && !selectedSchool?.schoolName ? (
        <p className="text-xs text-[#828282]">학교명을 입력하면 NEIS 학교 목록에서 검색돼요.</p>
      ) : null}
    </div>
  );
}
