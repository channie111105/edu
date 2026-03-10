import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHelp, Lock, School, UserRound } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setError('');
    void rememberMe;
    navigate('/module-selection');
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-50 p-4 md:h-screen md:overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100" />

      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center rounded-xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
            <School size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">ULA EduCRM</h1>
          <p className="text-slate-500">Hệ thống quản trị giáo dục tập trung</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-semibold text-slate-900">Chào mừng trở lại</h2>
            <p className="mt-1 text-sm text-slate-500">Vui lòng nhập thông tin để đăng nhập</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="username">
                Email hoặc tên đăng nhập
              </label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="name@university.edu"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Mật khẩu
                </label>
                <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <label className="text-sm text-slate-600" htmlFor="remember">
                Ghi nhớ đăng nhập
              </label>
            </div>

            {error ? (
              <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <CircleHelp size={16} />
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-[0.98]"
            >
              Đăng nhập
            </button>
          </form>

          <div className="mt-6">
            <div className="relative mb-4 flex items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="mx-4 shrink-0 text-xs font-medium uppercase tracking-wider text-slate-400">
                Bạn mới sử dụng ULA?
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-lg border border-slate-200 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Tạo tài khoản
            </button>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-400">
          <p>© 2026 ULA EduCRM. Powered by React & Gemini AI.</p>
          <div className="mt-3 flex justify-center gap-6">
            <button type="button" className="hover:text-blue-600">
              Hỗ trợ
            </button>
            <button type="button" className="hover:text-blue-600">
              Chính sách bảo mật
            </button>
            <button type="button" className="hover:text-blue-600">
              Điều khoản sử dụng
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
