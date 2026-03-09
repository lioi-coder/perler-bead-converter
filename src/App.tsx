import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import Home from './pages/Home';
import Preview from './pages/Preview';
import Materials from './pages/Materials';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="font-bold text-xl text-zinc-900 tracking-tight">PerlerMaker</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-zinc-600 hover:text-orange-600 transition-colors">首页</Link>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-zinc-600 hover:text-orange-600 transition-colors"
              >
                关于
              </a>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/materials" element={<Materials />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-zinc-200 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-zinc-400 text-sm">
              © {new Date().getFullYear()} PerlerMaker. 为手工爱好者设计的拼豆图纸工具。
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
