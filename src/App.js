import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Room from "./room";
import Home from "./home"
import LoginForm from "./login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route>
          <Route index element={<Home />} />
          <Route path="room" element={<Room />} />
          <Route path="login" element={<LoginForm />} />
          {/* <Route path="contact" element={<Contact />} /> */}
          {/* <Route path="*" element={<NoPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
