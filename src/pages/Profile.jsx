import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Camera, Star, Clock, Crown, Check, Edit2, Loader2, Trash2, NotebookPen, ChartNoAxesColumn } from 'lucide-react';
import { deleteAccount, getCurrentUser, updateUserProfile, setPremiumStatus } from '@/services/authService';
import { isNicknameAvailable, syncUserProfileRecord } from '@/services/profileService';
import { NICKNAME_MAX_LENGTH, validateNickname } from '@/lib/profileRules';
import { getIsPremium } from '@/lib/premium';
import PremiumBadge from '@/components/PremiumBadge';
import useProgress from '../lib/useProgress';

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}시간 ${m}분`;
}

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { progress, getProgressSummary, getStreakStatus } = useProgress();
  const [user, setUser] = useState(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [profileError, setProfileError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const fileInputRef = useRef(null);
  const progressSummary = getProgressSummary();
  const streakStatus = getStreakStatus();
  const displayName =
    user?.user_metadata?.nickname?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    '이름 없음';

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u);
      setNicknameInput(u?.user_metadata?.nickname || u?.user_metadata?.full_name || '');
      setIsPremium(getIsPremium(u));
    }).catch(() => {
      setUser(null);
      setIsPremium(false);
    });

    const stored = parseInt(localStorage.getItem('totalUsageSeconds') || '0');
    setTotalTime(stored);
  }, []);

  const handleSaveNickname = async () => {
    const nicknameError = validateNickname(nicknameInput);
    if (nicknameError) {
      setProfileError(nicknameError);
      return;
    }

    const previousNickname = user?.user_metadata?.nickname;
    const optimisticNickname = nicknameInput.trim();
    const nicknameAvailable = await isNicknameAvailable(optimisticNickname, user?.id);
    if (!nicknameAvailable) {
      setProfileError('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.');
      return;
    }

    setProfileError('');
    setUser(prev => ({
      ...prev,
      user_metadata: { ...prev?.user_metadata, nickname: optimisticNickname, full_name: optimisticNickname },
    }));
    setNicknameInput(optimisticNickname);
    setEditingNickname(false);
    setSaving(true);

    try {
      const updatedUser = await updateUserProfile({ nickname: optimisticNickname, full_name: optimisticNickname });
      await syncUserProfileRecord(updatedUser, optimisticNickname);
      setUser(updatedUser);
      setNicknameInput(updatedUser.user_metadata?.nickname || updatedUser.user_metadata?.full_name || '');
      setSaving(false);
    } catch (error) {
      console.error('Failed to save nickname:', error);
      setUser(prev => ({
        ...prev,
        user_metadata: { ...prev?.user_metadata, nickname: previousNickname, full_name: previousNickname },
      }));
      setNicknameInput(previousNickname || '');
      setEditingNickname(true);
      setProfileError(error.message || '닉네임 저장 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      window.location.href = '/login';
    } catch {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    // 실제 업로드 API 통합 필요
    const fileUrl = URL.createObjectURL(file);
    await updateUserProfile({ profile_picture: fileUrl });
    setUser(prev => ({
      ...prev,
      profile_picture: fileUrl,
      user_metadata: { ...(prev?.user_metadata || {}), profile_picture: fileUrl },
    }));
    window.dispatchEvent(new CustomEvent('profilePictureUpdated', { detail: { profile_picture: fileUrl } }));
    setUploadingPhoto(false);
  };

  const plans = [
    {
      id: 'free',
      name: '무료 플랜',
      price: '₩0',
      period: '영구',
      features: ['기본 학습 콘텐츠', '하루 5개 하트', '경제 용어 사전'],
      current: !isPremium,
      color: 'border-border bg-card',
      badge: null,
    },
    {
      id: 'premium',
      name: '프리미엄',
      price: '₩9,900',
      period: '/ 월',
      features: ['모든 학습 콘텐츠', '무제한 하트', '오프라인 학습', '퀴즈 해설, 진도 확인, 오답노트 ', 'Streak Freezer와 연속 학습 관리', '광고 없음'],
      current: isPremium,
      color: 'border-primary bg-primary/5',
      badge: '인기',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="font-extrabold text-foreground text-xl">프로필</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (user?.user_metadata?.profile_picture || user?.profile_picture) ? (
                  <img
                    src={user?.user_metadata?.profile_picture || user?.profile_picture}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-primary">
                    {(user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email || '?')[0] || '?'}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Name & Email */}
            <div className="flex-1 min-w-0">
              {editingNickname ? (
                <div className="flex flex-col gap-2 flex-1">
                  <input
                    value={nicknameInput}
                    onChange={e => {
                      setNicknameInput(e.target.value.slice(0, NICKNAME_MAX_LENGTH));
                      setProfileError('');
                    }}
                    placeholder="닉네임 입력"
                    className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-[14px] font-semibold text-foreground outline-none border border-primary/30"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveNickname()}
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={saving}
                    className="px-3 py-1.5 bg-primary text-white text-[12px] font-bold rounded-lg w-full"
                  >
                    {saving ? '저장 중...' : '닉네임 저장'}
                  </button>
                  {profileError ? <p className="text-[12px] text-destructive">{profileError}</p> : null}
                  <p className="text-[11px] text-muted-foreground">한글, 영문, 숫자, 밑줄(_) 가능 · {NICKNAME_MAX_LENGTH}자 이하</p>
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground text-[14px]">{displayName}</p>
                        {isPremium && <PremiumBadge compact />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">닉네임</p>
                    </div>
                    <button onClick={() => {
                      setEditingNickname(true);
                      setProfileError('');
                    }} className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
              </div>
              )}
              <p className="text-muted-foreground text-[12px] mt-0.5 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-accent fill-accent" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">누적 XP</p>
              <p className="text-[20px] font-extrabold text-foreground leading-tight">{progress?.xp || 0}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">사용 시간</p>
              <p className="text-[16px] font-extrabold text-foreground leading-tight">{formatTime(totalTime)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-[11px] text-muted-foreground">현재 스트릭</p>
            <p className="text-[20px] font-extrabold text-foreground leading-tight mt-1">{streakStatus.streakCount}일</p>
            <p className="text-[12px] text-muted-foreground mt-1">최고 {streakStatus.bestStreak}일</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-[11px] text-muted-foreground">Streak Freezer</p>
            <p className="text-[20px] font-extrabold text-foreground leading-tight mt-1">{streakStatus.streakFreezers}개</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {streakStatus.adsDisabled ? '광고 제거 적용 중' : '광고 제거 미적용'}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 animate-slide-up" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ChartNoAxesColumn className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-foreground text-[15px]">학습 진도</h2>
            </div>
            {isPremium && <PremiumBadge compact />}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">완료</p>
              <p className="text-[16px] font-extrabold text-foreground">{progressSummary.completedCount}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">전체</p>
              <p className="text-[16px] font-extrabold text-foreground">{progressSummary.totalQuizzes}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">달성률</p>
              <p className="text-[16px] font-extrabold text-foreground">{progressSummary.completionRate}%</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressSummary.completionRate}%` }} />
          </div>
          <p className="text-[12px] text-muted-foreground mt-3">
            {isPremium ? '프리미엄으로 진도와 오답노트를 함께 관리할 수 있어요.' : '상세 진도와 오답노트는 프리미엄에서 확인할 수 있어요.'}
          </p>
        </div>

        <button
          onClick={() => isPremium ? navigate('/review-note') : navigate('/premium')}
          className="w-full bg-card rounded-2xl border border-border p-4 animate-slide-up text-left"
          style={{ animationDelay: '140ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <NotebookPen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-foreground">오답노트</p>
                <p className="text-[12px] text-muted-foreground">
                  {isPremium ? `${progressSummary.reviewCount}개 문제를 다시 풀 수 있어요` : '프리미엄에서 틀린 문제를 다시 풀 수 있어요'}
                </p>
              </div>
            </div>
            {isPremium ? <PremiumBadge compact /> : <Crown className="w-4 h-4 text-primary" />}
          </div>
        </button>

        {/* Premium Plans */}
        <div className="animate-slide-up" style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-accent" />
            <h2 className="font-bold text-foreground text-[15px]">플랜 선택</h2>
          </div>
          <div className="space-y-3">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-4 transition-all ${plan.color}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-[15px]">{plan.name}</h3>
                    {plan.badge && (
                      <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                    {plan.current && (
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        현재
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-foreground text-[16px]">{plan.price}</span>
                    <span className="text-muted-foreground text-[11px]">{plan.period}</span>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-[12px] text-foreground/80">{f}</span>
                    </div>
                  ))}
                </div>
                {!isPremium && plan.id === 'premium' ? (
                   <button onClick={() => navigate('/premium')} className="w-full py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold shadow shadow-primary/20 active:scale-[0.98] transition-all">
                     프리미엄 시작하기
                   </button>
                ) : plan.id === 'premium' && isPremium ? (
                   <div className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground text-[13px] font-bold text-center">
                     ✓ 구독 중
                   </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={async () => {
            await logout();
          }}
          className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-[14px] font-semibold animate-slide-up"
          style={{ animationDelay: '240ms', animationFillMode: 'backwards' }}
        >
          로그아웃
        </button>

        {/* Delete account */}
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-muted-foreground text-[14px] font-medium animate-slide-up"
          style={{ animationDelay: '280ms', animationFillMode: 'backwards' }}
        >
          <Trash2 className="w-4 h-4" />
          계정 삭제
        </button>

        {/* Cancel subscription */}
        {isPremium && (
          <button
            onClick={async () => {
              if (confirm('정말로 프리미엄 구독을 취소하시겠습니까?')) {
                await setPremiumStatus(false);
                setIsPremium(false);
                setUser(prev => (
                  prev
                    ? {
                        ...prev,
                        user_metadata: { ...(prev.user_metadata || {}), is_premium: false },
                      }
                    : null
                ));
                // Refresh page to update premium-gated features
                setTimeout(() => window.location.reload(), 300);
              }
            }}
            className="w-full py-3 rounded-2xl text-muted-foreground text-[13px] font-medium animate-slide-up hover:text-foreground transition-colors"
            style={{ animationDelay: '320ms', animationFillMode: 'backwards' }}
          >
            구독 취소
          </button>
        )}

        {/* Delete confirmation dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
            <div className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border shadow-xl">
              <h3 className="text-[16px] font-bold text-foreground mb-2">계정을 삭제할까요?</h3>
              <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
                계정을 삭제하면 모든 학습 기록과 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-[14px] font-semibold text-foreground"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-destructive text-white text-[14px] font-semibold flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  삭제 확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
