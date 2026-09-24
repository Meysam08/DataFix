import React from 'react';
import { Database, Plus, Layers, Code, ShieldCheck, Wrench, Languages, Check } from 'lucide-react';
import { ActiveDataset } from '../types/dataset';
import { useI18n } from '../i18n/context';

export type ScreenId =
  | 'landing'
  | 'dashboard'
  | 'upload'
  | 'overview'
  | 'quality'
  | 'cleaning'
  | 'review'
  | 'export';

interface NavbarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  activeDataset: ActiveDataset | null;
  onOpenArchitecture: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  activeDataset,
  onOpenArchitecture,
}) => {
  const { t, language, setLanguage, isRTL } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Zone 1: Wordmark & Active Dataset Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate(activeDataset ? 'dashboard' : 'landing')}
            className="group flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 font-mono text-sm font-semibold text-white shadow-sm transition-transform group-hover:scale-105">
              DF
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-tight text-neutral-100 group-hover:text-blue-400 transition-colors">
                {t('appName')}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">{t('saas')}</span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors hover:text-neutral-100 cursor-pointer ${
              currentScreen === 'landing' ? 'text-blue-400 font-semibold' : 'text-neutral-400'
            }`}
          >
            {t('home')}
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`transition-colors hover:text-neutral-100 cursor-pointer ${
              currentScreen === 'dashboard' ? 'text-blue-400 font-semibold' : 'text-neutral-400'
            }`}
          >
            {t('dashboard')}
          </button>

          {activeDataset ? (
            <>
              <button
                onClick={() => onNavigate('overview')}
                className={`flex items-center gap-1.5 transition-colors hover:text-neutral-100 cursor-pointer ${
                  currentScreen === 'overview' ? 'text-blue-400 font-semibold' : 'text-neutral-400'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                {t('overview')}
              </button>
              <button
                onClick={() => onNavigate('quality')}
                className={`flex items-center gap-1.5 transition-colors hover:text-neutral-100 cursor-pointer ${
                  currentScreen === 'quality' ? 'text-blue-400 font-semibold' : 'text-neutral-400'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('quality')}
              </button>
              <button
                onClick={() => onNavigate('cleaning')}
                className={`flex items-center gap-1.5 transition-colors hover:text-neutral-100 cursor-pointer ${
                  currentScreen === 'cleaning' ? 'text-blue-400 font-semibold' : 'text-neutral-400'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                {t('cleaning')}
              </button>
              {activeDataset.currentTransform && (
                <button
                  onClick={() => onNavigate('review')}
                  className={`transition-colors hover:text-neutral-100 cursor-pointer ${
                    currentScreen === 'review' ? 'text-blue-400 font-semibold' : 'text-neutral-400'
                  }`}
                >
                  {t('review')}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onNavigate('upload')}
              className={`transition-colors hover:text-neutral-100 cursor-pointer ${
                currentScreen === 'upload' ? 'text-blue-400 font-semibold' : 'text-neutral-400'
              }`}
            >
              {t('upload')}
            </button>
          )}

          <button
            onClick={onOpenArchitecture}
            className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-blue-400 transition-colors px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 cursor-pointer"
          >
            <Code className="h-3.5 w-3.5 text-blue-400" />
            {t('architecture')}
          </button>
        </nav>

        {/* Zone 3: Language Switcher & Primary Action */}
        <div className="flex items-center gap-2.5">
          {/* Language Switch Button */}
          <div className="flex items-center rounded-md border border-neutral-800 bg-neutral-900 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('fa')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                language === 'fa'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              فارسی
            </button>
          </div>

          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-500 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('upload')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
