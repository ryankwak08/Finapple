import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Camera, Star, Clock, Crown, Check, Edit2, Loader2, Trash2, NotebookPen, ChartNoAxesColumn } from 'lucide-react';
import { cancelPremiumSubscription, deleteAccount, getCurrentUser, updateUserProfile, uploadProfilePicture } from '@/services/authService';
import { findAdminManagedUser, updateAdminManagedUser } from '@/api/adminClient';
import { syncLeaderboardEntry } from '@/api/leaderboardClient';
import { isNicknameAvailable, syncUserProfileRecord } from '@/services/profileService';
import { NICKNAME_MAX_LENGTH, validateNickname } from '@/lib/profileRules';
import { buildLeaderboardPayload } from '@/lib/leaderboard';
import { allocateTrackLeaderboardScores } from '@/lib/leaderboardTrackScores';
import { getIsPremium, isAdminUser } from '@/lib/premium';
import { useTrack } from '@/lib/trackContext';
import useSoundEffects from '@/hooks/useSoundEffects';
import PremiumBadge from '@/components/PremiumBadge';
import { Switch } from '@/components/ui/switch';
import useProgress from '../lib/useProgress';
import { safeStorage } from '@/lib/safeStorage';
import { isNativeIOSApp } from '@/lib/runtimePlatform';

const getUsageStorageKey = (email) => `totalUsageSeconds:${email || 'guest'}`;

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
  const { progress, getProgressSummary, getStreakStatus, reload: reloadProgress } = useProgress();
  const { activeTrack } = useTrack();
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
  const [photoError, setPhotoError] = useState('');
  const [adminQuery, setAdminQuery] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [managedUser, setManagedUser] = useState(null);
  const [managedHearts, setManagedHearts] = useState('5');
  const [managedPremium, setManagedPremium] = useState(false);
  const fileInputRef = useRef(null);
  const { enabled: soundEnabled, setEnabled: setSoundEnabled, playSuccessSound } = useSoundEffects();
  const progressSummary = getProgressSummary();
  const streakStatus = getStreakStatus();
  const isAdmin = isAdminUser(user);
  const displayName =
    user?.user_metadata?.nickname?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    '이름 없음';
  const nativeIOS = isNativeIOSApp();
  const premiumProvider = String(user?.user_metadata?.premium_provider || user?.premium_provider || '').toLowerCase();
  const canCancelPremiumOnWeb = premiumProvider === 'kcp';

  const syncLeaderboardProfile = async (nextUser, nextPremium = isPremium) => {
    if (!progress || !nextUser?.email) {
      return;
    }

    const nextEntry = buildLeaderboardPayload({
      user: nextUser,
      progress,
      streakStatus: {
        ...streakStatus,
        adsDisabled: nextPremium,
      },
    });

    const trackScores = allocateTrackLeaderboardScores({
      user: nextUser,
      seasonKey: nextEntry.seasonKey,
      totalScore: nextEntry.score,
      activeTrack,
    });

    await syncLeaderboardEntry({
      ...nextEntry,
      trackScores,
    }).catch((syncError) => {
      console.error('Leaderboard profile sync failed:', syncError);
    });
  };

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u);
      setNicknameInput(u?.user_metadata?.nickname || u?.user_metadata?.full_name || '');
      setIsPremium(getIsPremium(u));
      const usageKey = getUsageStorageKey(u?.email || 'guest');
      const stored = parseInt(safeStorage.getItem(usageKey) || '0');
      setTotalTime(stored);
    }).catch(() => {
      setUser(null);
      setIsPremium(false);
      const usageKey = getUsageStorageKey('guest');
      const stored = parseInt(safeStorage.getItem(usageKey) || '0');
      setTotalTime(stored);
    });
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
      await syncLeaderboardProfile(updatedUser);
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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      const updatedUser = await uploadProfilePicture(file);
      const nextProfilePicture = updatedUser?.user_metadata?.profile_picture || updatedUser?.profile_picture || '';
      setUser(updatedUser);
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', { detail: { profile_picture: nextProfilePicture } }));
      await syncLeaderboardProfile(updatedUser);
      await playSuccessSound();
    } catch (uploadError) {
      console.error('Failed to upload profile photo:', uploadError);
      setPhotoError(uploadError.message || '프로필 사진을 저장하지 못했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAdminLookup = async () => {
    const query = adminQuery.trim();
    if (!query) {
      setAdminError('이메일 또는 닉네임을 입력해주세요.');
      return;
    }

    setAdminLoading(true);
    setAdminError('');
    setAdminSuccess('');

    try {
      const nextManagedUser = await findAdminManagedUser(query);
      setManagedUser(nextManagedUser);
      setManagedHearts(String(nextManagedUser.hearts ?? 5));
      setManagedPremium(Boolean(nextManagedUser.isPremium));
    } catch (error) {
      setManagedUser(null);
      setAdminError(error.message || '사용자 조회 중 오류가 발생했습니다.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminSave = async () => {
    if (!managedUser?.userId) {
      setAdminError('먼저 수정할 사용자를 불러와주세요.');
      return;
    }

    const hearts = Number(managedHearts);
    if (!Number.isInteger(hearts) || hearts < 0 || hearts > 5) {
      setAdminError('하트는 0~5 사이 정수만 입력할 수 있어요.');
      return;
    }

    setAdminSaving(true);
    setAdminError('');
    setAdminSuccess('');

    try {
      const updatedUser = await updateAdminManagedUser({
        userId: managedUser.userId,
        hearts,
        isPremium: managedPremium,
      });

      setManagedUser(updatedUser);
      setManagedHearts(String(updatedUser.hearts ?? hearts));
      setManagedPremium(Boolean(updatedUser.isPremium));
      setAdminSuccess('사용자 상태를 저장했습니다.');

      if (updatedUser.email === user?.email) {
        setIsPremium(Boolean(updatedUser.isPremium));
        setUser(prev => (
          prev
            ? {
                ...prev,
                is_premium: Boolean(updatedUser.isPremium),
                user_metadata: {
                  ...(prev.user_metadata || {}),
                  is_premium: Boolean(updatedUser.isPremium),
                },
              }
            : prev
        ));
        await reloadProgress();
      }
    } catch (error) {
      setAdminError(error.message || '사용자 상태 저장 중 오류가 발생했습니다.');
    } finally {
      setAdminSaving(false);
    }
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
      price: '₩5,500 / ₩55,000',
      period: '월 / 연',
      features: ['모든 학습 콘텐츠', '무제한 하트', 'Streak Freezer 매월 3개 지급', '퀴즈 해설, 진도 확인, 오답노트', '연속 학습 관리', '광고 없음'],
      current: isPremium,
      color: 'border-primary bg-primary/5',
      badge: '인기',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-4 pt-8 sm:px-5 sm:pt-10">
        <button onClick={() => navigate(-1)} className="rounded-xl p-2 transition-colors hover:bg-muted">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="font-extrabold text-foreground text-xl">프로필</h1>
      </div>

      <div className="space-y-5 px-4 sm:px-5">
        {/* Profile Card */}
        <div className="animate-slide-up rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative mx-auto sm:mx-0">
              <div
                className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-primary/10 sm:h-20 sm:w-20"
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
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow sm:h-7 sm:w-7"
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
            <div className="min-w-0 flex-1">
              {editingNickname ? (
                <div className="flex flex-1 flex-col gap-2">
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
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex items-start gap-2 sm:justify-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <p className="truncate font-bold text-[16px] text-foreground">{displayName}</p>
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
              <p className="mt-0.5 break-all text-[12px] text-muted-foreground">{user?.email || ''}</p>
            </div>
          </div>
          {photoError ? <p className="mt-3 text-[12px] text-destructive">{photoError}</p> : null}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 animate-slide-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-accent fill-accent" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">누적 XP</p>
              <p className="text-[20px] font-extrabold text-foreground leading-tight">{progress?.xp || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">사용 시간</p>
              <p className="text-[16px] font-extrabold text-foreground leading-tight">{formatTime(totalTime)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground">현재 스트릭</p>
            <p className="text-[20px] font-extrabold text-foreground leading-tight mt-1">{streakStatus.streakCount}일</p>
            <p className="text-[12px] text-muted-foreground mt-1">최고 {streakStatus.bestStreak}일</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground">Streak Freezer</p>
            <p className="text-[20px] font-extrabold text-foreground leading-tight mt-1">{streakStatus.streakFreezers}개</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {streakStatus.adsDisabled
                ? '스트릭이 깨질 상황에서 자동 보호 적용'
                : '광고 제거 미적용'}
            </p>
          </div>
        </div>

        <div className="animate-slide-up rounded-2xl border border-border bg-card p-4" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ChartNoAxesColumn className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-foreground text-[15px]">학습 진도</h2>
            </div>
            {isPremium && <PremiumBadge compact />}
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
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

        <div className="animate-slide-up rounded-2xl border border-border bg-card p-4" style={{ animationDelay: '130ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-foreground">효과음</p>
              <p className="text-[12px] text-muted-foreground mt-1">정답, 오답, 완료 시 간단한 사운드를 재생해요.</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
        </div>

        {isAdmin && (
          <div className="animate-slide-up rounded-2xl border border-primary/20 bg-primary/5 p-4" style={{ animationDelay: '135ms', animationFillMode: 'backwards' }}>
            <div className="mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <h2 className="text-[15px] font-bold text-foreground">관리자 사용자 제어</h2>
            </div>
            <p className="text-[12px] text-muted-foreground">
              이메일 또는 닉네임으로 사용자를 찾은 뒤 하트와 프리미엄 상태를 바로 수정할 수 있어요.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={adminQuery}
                onChange={(event) => {
                  setAdminQuery(event.target.value);
                  setAdminError('');
                  setAdminSuccess('');
                }}
                placeholder="이메일 또는 닉네임"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none"
              />
              <button
                type="button"
                onClick={handleAdminLookup}
                disabled={adminLoading}
                className="rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-white"
              >
                {adminLoading ? '조회 중...' : '사용자 조회'}
              </button>
            </div>

            {managedUser ? (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-foreground">{managedUser.nickname}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{managedUser.email}</p>
                  </div>
                  <div className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-foreground">
                    {managedUser.isPremium ? '프리미엄' : '무료'}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[12px] font-semibold text-foreground">하트</span>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={managedHearts}
                      onChange={(event) => setManagedHearts(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none"
                    />
                  </label>

                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-semibold text-foreground">프리미엄</p>
                        <p className="text-[11px] text-muted-foreground mt-1">사용자 구독 상태를 직접 변경합니다.</p>
                      </div>
                      <Switch checked={managedPremium} onCheckedChange={setManagedPremium} />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdminSave}
                  disabled={adminSaving}
                  className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-white"
                >
                  {adminSaving ? '저장 중...' : '관리자 상태 저장'}
                </button>
              </div>
            ) : null}

            {adminError ? <p className="mt-3 text-[12px] text-destructive">{adminError}</p> : null}
            {adminSuccess ? <p className="mt-3 text-[12px] text-emerald-600">{adminSuccess}</p> : null}
          </div>
        )}

        <button
          onClick={() => isPremium ? navigate('/review-note') : navigate('/premium')}
          className="w-full rounded-2xl border border-border bg-card p-4 text-left animate-slide-up"
          style={{ animationDelay: '140ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <NotebookPen className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
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
          <div className="mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-accent" />
            <h2 className="font-bold text-foreground text-[15px]">플랜 선택</h2>
          </div>
          <div className="space-y-3">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-4 transition-all ${plan.color}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                  <div className="shrink-0 text-right">
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
        {isPremium ? (
          <button
            onClick={async () => {
              const confirmMessage = nativeIOS
                ? 'App Store 구독 관리 화면으로 이동할까요? 구독 상태 변경은 Apple 계정에서 진행됩니다.'
                : canCancelPremiumOnWeb
                ? '정말로 프리미엄 구독을 해지할까요? 다음 결제일부터 자동 청구가 중단됩니다.'
                : '현재 구독은 앱에서 직접 해지할 수 없습니다. 안내 문구를 확인해주세요.';

              if (!confirm(confirmMessage)) {
                return;
              }

              try {
                const result = await cancelPremiumSubscription(user);
                if (result.platform === 'ios') {
                  return;
                }

                setIsPremium(false);
                setUser((prev) => (
                  prev
                    ? {
                        ...prev,
                        is_premium: false,
                        user_metadata: {
                          ...(prev.user_metadata || {}),
                          is_premium: false,
                          premium_status: 'canceled',
                        },
                      }
                    : null
                ));
                await reloadProgress();
              } catch (error) {
                alert(error.message || '구독 해지 중 오류가 발생했습니다.');
              }
            }}
            className="w-full py-3 rounded-2xl text-muted-foreground text-[13px] font-medium animate-slide-up hover:text-foreground transition-colors"
            style={{ animationDelay: '320ms', animationFillMode: 'backwards' }}
          >
            {nativeIOS ? 'App Store 구독 관리' : '구독 해지'}
          </button>
        ) : null}

        {/* Delete confirmation dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 sm:px-6">
            <div className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border shadow-xl">
              <h3 className="text-[16px] font-bold text-foreground mb-2">계정을 삭제할까요?</h3>
              <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
                계정을 삭제하면 모든 학습 기록과 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
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
