
import React from 'react';
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

type StartupErrorProps = {
  error: unknown;
};

const StartupErrorScreen: React.FC<StartupErrorProps> = ({ error }) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  const details = error instanceof Error ? error.stack : String(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-red-600">Startup Error</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Khong the khoi tao ung dung</h1>
        <p className="mt-3 text-sm text-slate-600">
          Kiem tra terminal dev server va thu tai lai trang. Neu van loi, thong tin ben duoi se chi ra module gay loi.
        </p>
        <div className="mt-5 rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
          <p className="font-semibold text-red-300">{message}</p>
          {details ? <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{details}</pre> : null}
        </div>
      </div>
    </div>
  );
};

const renderStartupError = (error: unknown) => {
  console.error('Failed to bootstrap EduCRM', error);
  root.render(<StartupErrorScreen error={error} />);
};

const bootstrap = async () => {
  try {
    await import('./i18n');
    const [{ initializeData }, { default: App }] = await Promise.all([
      import('./utils/storage'),
      import('./App'),
    ]);

    initializeData();

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    renderStartupError(error);
  }
};

void bootstrap();
