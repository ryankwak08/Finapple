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

  const schoolName = user?.user_metadata?.school_name || user?.school_name || '';
  const schoolCode = user?.user_metadata?.school_code || user?.school_code || '';
  const educationOfficeCode = user?.user_metadata?.education_office_code || user?.education_office_code || '';
  const educationOfficeName = user?.user_metadata?.education_office_name || user?.education_office_name || '';
  const schoolType = user?.user_metadata?.school_type || user?.school_type || '';
  const schoolRegion = user?.user_metadata?.school_region || user?.school_region || '';

  const payload = {
    user_id: user.id,
    email: user.email,
    nickname,
    avatar_url: user?.user_metadata?.profile_picture || user?.profile_picture || '',
    school_name: schoolName,
    school_code: schoolCode,
    education_office_code: educationOfficeCode,
    education_office_name: educationOfficeName,
    school_type: schoolType,
    school_region: schoolRegion,
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
