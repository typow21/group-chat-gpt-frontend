import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Room from "./room";
import Home from "./home"
import LoginForm from "./login";
import SignupForm from "./signup";
import Friends from "./friends";
import { ThemeProvider } from "./ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes basename={process.env.PUBLIC_URL}>
          <Route>
            <Route index element={<Home />} />
            <Route path="/room/:room_id" element={<Room />} />
            <Route path="login" element={<LoginForm />} />
            <Route path="signup" element={<SignupForm />}></Route>
            <Route path="friends" element={<Friends />} />
            {/* <Route path="contact" element={<Contact />} /> */}
            {/* <Route path="*" element={<NoPage />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
