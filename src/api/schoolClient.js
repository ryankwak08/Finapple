import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';

const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function normalizeSchoolRecord(school) {
  if (!school) {
    return null;
  }

  return {
    schoolName: school.schoolName || school.school_name || school.SCHUL_NM || '',
    schoolCode: school.schoolCode || school.school_code || school.SD_SCHUL_CODE || '',
    educationOfficeCode: school.educationOfficeCode || school.education_office_code || school.ATPT_OFCDC_SC_CODE || '',
    educationOfficeName: school.educationOfficeName || school.education_office_name || school.ATPT_OFCDC_SC_NM || '',
    schoolType: school.schoolType || school.school_type || school.SCHUL_KND_SC_NM || '',
    regionName: school.regionName || school.school_region || school.LCTN_SC_NM || '',
    address: school.address || school.ORG_RDNMA || school.ORG_RDNDA || '',
  };
}

export function getSchoolDisplayName(school) {
  const normalized = normalizeSchoolRecord(school);
  if (!normalized?.schoolName) {
    return '';
  }

  const details = [normalized.regionName, normalized.schoolType].filter(Boolean).join(' · ');
  return details ? `${normalized.schoolName} (${details})` : normalized.schoolName;
}

export async function searchSchools(query) {
  const trimmedQuery = String(query || '').trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const params = new URLSearchParams({ query: trimmedQuery });
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/schools/search?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || '학교 검색에 실패했습니다.');
  }

  return (result.schools || []).map(normalizeSchoolRecord).filter((school) => school.schoolName && school.schoolCode);
}

export async function updateMySchool(school) {
  const normalizedSchool = normalizeSchoolRecord(school);
  if (!normalizedSchool?.schoolName || !normalizedSchool?.schoolCode || !normalizedSchool?.educationOfficeCode) {
    throw new Error('목록에서 학교를 선택해주세요.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다.');
  }

  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/schools/me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ school: normalizedSchool }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || '학교 정보를 저장하지 못했습니다.');
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...result.school,
      },
    });
    if (error) {
      throw error;
    }

    return {
      school: result.school,
      user: data?.user || null,
    };
  } catch (serverError) {
    console.warn('School server update failed. Falling back to Supabase client update.', serverError);
  }

  const schoolPayload = {
    school_name: normalizedSchool.schoolName,
    school_code: normalizedSchool.schoolCode,
    education_office_code: normalizedSchool.educationOfficeCode,
    education_office_name: normalizedSchool.educationOfficeName || '',
    school_type: normalizedSchool.schoolType || '',
    school_region: normalizedSchool.regionName || '',
  };

  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...schoolPayload,
    },
  });
  if (error) {
    throw error;
  }

  const updatedUser = data?.user || sessionData.session.user;
  const profilePayload = {
    user_id: updatedUser.id,
    email: updatedUser.email,
    nickname: updatedUser.user_metadata?.nickname || updatedUser.user_metadata?.full_name || updatedUser.email?.split('@')[0] || '학습자',
    avatar_url: updatedUser.user_metadata?.profile_picture || '',
    ...schoolPayload,
    updated_at: new Date().toISOString(),
  };

  const { data: existingProfile, error: lookupError } = await supabase
    .from('user_profiles')
    .select('user_id, email')
    .or(`user_id.eq.${updatedUser.id},email.eq.${updatedUser.email}`)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const profileMutation = existingProfile
    ? supabase
        .from('user_profiles')
        .update(profilePayload)
        .eq('user_id', existingProfile.user_id)
    : supabase
        .from('user_profiles')
        .insert(profilePayload);

  const { error: profileError } = await profileMutation;
  if (profileError) {
    throw profileError;
  }

  return {
    school: schoolPayload,
    user: data?.user || null,
  };
}
