// 로컬 개발용 더미 클라이언트입니다.
// 실제 서비스로 전환할 때 해당 코드를 한국 결제/사용자 API로 교체하세요.

const exampleUser = {
  email: 'guest@example.com',
  full_name: 'Guest User',
  profile_picture: '',
  is_premium: false,
  role: 'user'
};

export const apiClient = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => exampleUser,
    updateMe: async (updates) => ({ ...exampleUser, ...updates }),
    deleteMe: async () => null,
    logout: () => {},
    redirectToLogin: () => { window.location.href = '/login'; },
  },
  entities: {
    UserProgress: {
      filter: async () => [],
      update: async () => null,
      create: async (progress) => ({ id: 'local-progress', ...progress }),
    },
  },
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: '' }),
      InvokeLLM: async () => ({ output: 'local model dummy response' }),
    },
  },
  functions: {
    invoke: async () => ({ data: { url: '/' } }),
  }
};
