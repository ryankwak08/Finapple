export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 12;
export const PASSWORD_MIN_LENGTH = 8;

export function normalizeNickname(value = '') {
  return value.trim();
}

export function validateNickname(value = '') {
  const nickname = normalizeNickname(value);

  if (!nickname) {
    return '닉네임을 입력해주세요.';
  }

  if (nickname.length < NICKNAME_MIN_LENGTH || nickname.length > NICKNAME_MAX_LENGTH) {
    return `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`;
  }

  if (!/^[0-9A-Za-z가-힣_]+$/.test(nickname)) {
    return '닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요.';
  }

  return '';
}

export function validatePassword(value = '') {
  if (!value) {
    return '비밀번호를 입력해주세요.';
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해요.`;
  }

  if (!/[A-Za-z]/.test(value)) {
    return '비밀번호에 영문을 포함해주세요.';
  }

  if (!/[0-9]/.test(value)) {
    return '비밀번호에 숫자를 포함해주세요.';
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return '비밀번호에 특수문자를 포함해주세요.';
  }

  return '';
}
