import React, {useRef, useState, useEffect } from "react";
import profileImg from "../../assets/img/profile.png";
import profileEdit from "../../assets/img/imgedit.png";
import profilemusic from "../../assets/img/search.png";
import { get, put, post, uploadProfile } from "../../Api";
import config from "../../Config";

const Profile = () => {
  const fileInputRef = useRef(null);

  const [nickname, setNickname] = useState("Likelion#1253");
  const [intro, setIntro] = useState("안녕하세요");
  const [song, setSong] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await get(config.PROFILE.GET);

      const result = response?.result;

      console.log("프로필 데이터:", result);
      
      if(!result) return;

      setNickname(result.username ?? "");
      setIntro(result.introduction ?? "");
      setProfileImageUrl(result.profileImageUrl ?? null);

      const songResponse = await get(config.YOUTUBE.ME);

      if(
        songResponse?.isSuccess === false ||
        !Array.isArray(songResponse?.result)
      ) {
        throw new Error("유효하지 않은 노래 데이터 형식");
      }

      const songs = [...songResponse.result].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const latest = songs[0];

      setSong(latest? `${latest.title}` - `${latest.artist}` : "");
      
    } catch (error) {
      console.error("프로필 데이터를 가져오는 중 오류 발생:", error);
    }
  };

  const handleClickEditIcon = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const displayImageSrc = previewUrl || profileImageUrl || profileImg;

  const handleSave = async () => {
    try {
      await put(
        config.PROFILE.INTRO, {introduce: intro, }
      );

      if (selectedImageFile) {
        await uploadProfile(
          config.PROFILE.PUT,
          {imageFile: selectedImageFile},
          {imageField: "image"}
        );
      }

      await handleSaveSong();

      await fetchProfileData();

      if(previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(null);
      setSelectedImageFile(null);

      alert("프로필이 저장됐어요!");
    } catch (error) {
      console.error("프로필 저장 중 오류 발생:", error);
      
      const message = error?.response?.data?.message ?? "프로필 저장 중 오류가 발생했습니다.";

      alert(message);
    }
  };

  const handleSearchSong = async () => {
    if (!song.trim()) {
      alert("검색어를 입력해주세요.");
      return;
    }

    try {
      const response = await get(config.YOUTUBE.SEARCH, { q: song.trim() });

      console.log("노래 검색 결과:", response);

      const results = response?.result ?? [];

      setSearchResults(results);

      setShowSearchResults(true);
    } catch (error) {
      console.error("노래 검색 중 오류 발생:", error);
      alert("노래 검색 중 오류가 발생했습니다.");
    }
  };

  const handleSelectSong = (picked) => {
    setSelectedSong(picked);

    setSong(`${picked.title} - ${picked.artist}`);
    setShowSearchResults(false);
  }

  const handleSaveSong = async () => {
    if (!selectedSong) return;

    try {
      await post(config.YOUTUBE.SAVE, {
        songId: selectedSong.songId,
        title: selectedSong.title,
        artist: selectedSong.artist,
      });

      console.log("노래 저장 성공");

      setSelectedSong(null);

    } catch (error) {
      console.error("노래 저장 중 오류 발생:", error);
      throw error;
    }
  };

  return (
    <div className="profile-container">
        <div className="profile-section">
            <div className="profile-image">
                <img 
                    src={displayImageSrc} 
                    alt="프로필 이미지" 
                    className="profile-img" 
                />
                <img
                    src={profileEdit}
                    alt="프로필 수정 아이콘"
                    className="profile-img-edit"
                    onClick={handleClickEditIcon}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                    accept="image/*"
                />
            </div>
            <div className="profile-name">
                    {nickname}
            </div>
            <button className="profile-edit" onClick={handleSave}>프로필 저장</button>
        </div>
        <div className="profile-info">
            <div className="profile-details">
                <div className="profile-title">
                    한 줄 소개
                </div>
                <div className="profile-content-box">
                    <div className="profile-content">
                        <input
                            className="profile-content-input"
                            value={intro}
                            onChange={(e) => setIntro(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className="profile-details">
                <div className="profile-title">
                    좋아하는 노래
                </div>
                <div className="profile-content-box">
                    <div className="profile-content">
                        <input
                            className="profile-content-input"
                            value={`${song}`}
                            placeholder="좋아하는 노래를 검색해보세요"
                            onChange={(e) => {
                              setSong(e.target.value);
                              setSelectedSong(null);
                              setShowSearchResults(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSearchSong();
                              }
                            }}
                        />
                    </div>
                    <img
                        src={profilemusic}
                        alt="프로필 노래 수정 아이콘"
                        className="profile-search-icon"
                        onClick={handleSearchSong}
                        style={{ cursor: "pointer" }}
                    />
                </div>

                {showSearchResults && (
                  <div className="song-search-results">
                    {searchResults.length === 0 ? (
                      <p>검색 결과가 없습니다.</p>
                    ) : (
                      searchResults.map((item) => (
                        <div
                          key={item.songId}
                          className="song-search-item"
                          onClick={() => handleSelectSong(item)}
                        >
                          {item.title} - {item.artist}
                        </div>
                      ))
                    )}
                  </div>
                )}
            </div>
        </div>
    </div>
  );
};


export default Profile;