import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, X } from 'lucide-react';
import SchoolSelector from '@/components/SchoolSelector';
import { updateMySchool } from '@/api/schoolClient';
import { safeStorage } from '@/lib/safeStorage';
import { useAuth } from '@/lib/AuthContext';

const getTodayKey = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const getDismissKey = (userId) => `finapple:school-prompt-dismissed:${userId || 'guest'}`;

export default function SchoolOnboardingPrompt({ user, onSaved }) {
  const { checkAppState } = useAuth();
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const displayName = useMemo(() => (
    user?.user_metadata?.nickname ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    '학습자'
  ), [user]);

  useEffect(() => {
    if (!user?.id) {
      setOpen(false);
      return;
    }

    if (user?.user_metadata?.school_code) {
      setOpen(false);
      return;
    }

    const dismissedDate = safeStorage.getItem(getDismissKey(user.id));
    setOpen(dismissedDate !== getTodayKey());
  }, [user?.id, user?.user_metadata?.school_code]);

  if (!open || !user?.id || user?.user_metadata?.school_code) {
    return null;
  }

  const closeForToday = () => {
    safeStorage.setItem(getDismissKey(user.id), getTodayKey());
    setOpen(false);
  };

  const handleSave = async () => {
    if (!selectedSchool?.schoolCode) {
      setError('검색 결과에서 학교를 선택해주세요.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const result = await updateMySchool(selectedSchool);
      await checkAppState();
      onSaved?.(result.user);
      setOpen(false);
    } catch (saveError) {
      setError(saveError.message || '학교 정보를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-primary">학교 리그 준비</p>
              <h2 className="mt-1 text-lg font-extrabold text-black">{displayName}님의 학교를 등록해주세요</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#555]">
                학교별 리더보드에 반영할 학교를 NEIS 목록에서 정확하게 선택할 수 있어요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-[#777] transition hover:bg-slate-100 hover:text-black"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <SchoolSelector value={selectedSchool} onChange={setSelectedSchool} />
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={closeForToday}
            className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm font-semibold text-black transition hover:bg-slate-50"
          >
            오늘 다시보지 않기
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedSchool?.schoolCode}
            className="h-10 rounded-lg bg-black px-3 text-sm font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? '저장 중...' : '학교 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
