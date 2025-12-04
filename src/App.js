import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Room from "./room";
import Home from "./home"
import Rooms from "./rooms";
import LoginForm from "./login";
import SignupForm from "./signup";
import Friends from "./friends";
import Profile from "./Profile";
import Layout from "./Layout";
import QuickBots from "./QuickBots";
import { ThemeProvider } from "./ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes basename={process.env.PUBLIC_URL}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/room/:room_id" element={<Room />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="friends" element={<Friends />} />
            <Route path="bots" element={<QuickBots />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="login" element={<LoginForm />} />
          <Route path="signup" element={<SignupForm />}></Route>
          {/* <Route path="contact" element={<Contact />} /> */}
          {/* <Route path="*" element={<NoPage />} /> */}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
