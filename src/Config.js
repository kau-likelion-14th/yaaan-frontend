const config = {
  API_URL: "",

  AUTH: {
    KAKAO: "/api/auth/kakao",
    REISSUE: "/api/auth/reissue",
    LOGOUT: "/api/auth/logout",
    WITHDRAW: "/api/auth/withdraw",
  },

  FOLLOW: {
    AVAILABLE: "/api/follow",
    SEARCH: "/api/follow/search",
    CREATE: "/api/follow",
    FOLLOWINGS: "/api/follow/followings",
    DELETE: "/api/follow",
  },

  PROFILE: {
    DELETE: "/api/profile",
    PUT: "/api/profile",
    GET: "/api/profile",
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
