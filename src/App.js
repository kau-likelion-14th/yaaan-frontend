import React from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import MainPage from './pages/MainPage/Mainpage';
import MyPage from "./pages/MyPage/MyPage";
import { Routes, Route, useLocation  } from 'react-router-dom';
import LoginPage from './pages/LoginPage/Loginpage';

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div>
      {!isLoginPage && <Header />}
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      {!isLoginPage && <Footer />}
    </div>
  );
}

export default App;