import { supabase } from '@/lib/supabase';
import { normalizeNickname } from '@/lib/profileRules';

export async function isNicknameAvailable(nickname, excludeUserId = null) {
  const normalizedNickname = normalizeNickname(nickname);
  if (!normalizedNickname) {
    return false;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('nickname', normalizedNickname)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return true;
  }

  return data.user_id === excludeUserId;
}

export async function syncUserProfileRecord(user, overrideNickname) {
  const nickname = normalizeNickname(
    overrideNickname ||
    user?.user_metadata?.nickname ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    ''
  );

  if (!user?.id || !user?.email || !nickname) {
    return null;
  }

  const payload = {
    user_id: user.id,
    email: user.email,
    nickname,
    avatar_url: user?.user_metadata?.profile_picture || user?.profile_picture || '',
    updated_at: new Date().toISOString(),
  };

  const { data: existingProfile, error: lookupError } = await supabase
    .from('user_profiles')
    .select('user_id, email')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existingProfile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('user_id', existingProfile.user_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
