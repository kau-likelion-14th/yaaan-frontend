const config = {
  API_URL: "",

  AUTH: {
    KAKAO: "/api/auth/kakao",
    REISSUE: "/api/auth/reissue",
    LOGOUT: "/api/auth/logout",
    WITHDRAW: "/api/auth/withdraw",
  },

  FOLLOW: {
    PROFILE: (id) => `/api/follow/${encodeURIComponent(id)}`,
    TODOS: (id) => `/api/follow/${encodeURIComponent(id)}/todos`,
    CALENDAR: (id) => `/api/follow/${encodeURIComponent(id)}/calendar`,
    AVAILABLE: "/api/follow",
    SEARCH: "/api/follow/search",
    CREATE: "/api/follow",
    FOLLOWINGS: "/api/follow/followings",
    DELETE: "/api/follow",
  },

  PROFILE: {
    GET: "/api/profile",
    PUT: "/api/profile",
    DELETE: "/api/profile",
    INTRO: "/api/profile/intro",
  },

  STATISTICS: {
    GET: "/api/statistic",
  },

  YOUTUBE: {
    SEARCH: "/api/youtube/search",
    SAVE: "/api/youtube/save",
    ME: "/api/youtube/me",
  },
};

export default config;
