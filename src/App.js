import React from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import MainPage from './pages/MainPage/Mainpage';
<<<<<<< HEAD
import MyPage from "./pages/MyPage/MyPage";
import { Routes, Route } from 'react-router-dom';
=======
import LoginPage from './pages/LoginPage/Loginpage';
import { Routes, Route, useLocation } from 'react-router-dom';
>>>>>>> 5d620eebe053b16ad2faba89e7c46ef16fc85f30

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div>
      {!isLoginPage && <Header />}
      <Routes>
        <Route path="/" element={<MainPage />} />
<<<<<<< HEAD
        <Route path="/mypage" element={<MyPage />} />
=======
        <Route path="/login" element={<LoginPage />} />
>>>>>>> 5d620eebe053b16ad2faba89e7c46ef16fc85f30
      </Routes>
      {!isLoginPage && <Footer />}
    </div>
  );
}

export default App;