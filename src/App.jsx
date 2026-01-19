import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "./components/theme-provider" // Import this
import Navbar from './components/Navbar';
import { ChatInterface } from './components/chat-interface';
import Editor from './pages/Editor';

function App() {
  return (
    // Wrap everything in ThemeProvider
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
          <Navbar />
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<ChatInterface />} />
              <Route path="/draft" element={<Editor />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;