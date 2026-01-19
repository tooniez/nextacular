import { useEffect, useState } from 'react';
import Router, { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import ReactGA from 'react-ga';
import TopBarProgress from 'react-topbar-progress-indicator';
import { SWRConfig } from 'swr';
import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";

import progressBarConfig from '@/config/progress-bar/index';
import swrConfig from '@/config/swr/index';
import WorkspaceProvider from '@/providers/workspace';
import ErrorBoundary from '@/components/ErrorBoundary';

import '@/styles/globals.css';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
let rawdata = require('../messages/en.json');

let langCode = "en"
let langObject = {}
langObject[langCode] = {}

langObject[langCode].translation = rawdata
i18n
  .use(initReactI18next)
  .init({
    resources: langObject,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

const App = ({ Component, pageProps }) => {
  const [progress, setProgress] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const swrOptions = swrConfig();
  const [gaEnabled, setGaEnabled] = useState(false);

  // #region agent log
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const hideFoucCount = document.querySelectorAll?.('style[data-next-hide-fouc]')?.length ?? null;
      const bodyDisplay = document.body ? String(getComputedStyle(document.body)?.display || '') : null;
      fetch('/api/_debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'client-mount',
          hypothesisId: 'APP_1',
          location: 'pages/_app.js',
          message: 'app mounted',
          data: {
            path: String(window.location?.pathname || '').slice(0, 120),
            bodyDisplay,
            hideFoucCount,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
  }, []);
  // #endregion

  useEffect(() => {
    const navigationTimes = new Map();
    
    
    const handleStart = (url) => {
      const startTime = performance.now();
      navigationTimes.set(url, startTime);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[PERF] Route change START:', { url, currentPath: router.asPath, timestamp: Date.now(), perfTime: startTime });
      }
      setProgress(true);
    };
    const handleComplete = (url) => {
      const startTime = navigationTimes.get(url);
      const duration = startTime ? (performance.now() - startTime).toFixed(2) : 'unknown';
      navigationTimes.delete(url);
      // #region agent log
      if (process.env.NODE_ENV !== 'production') {
        console.log('[PERF] Route change COMPLETE:', { url, currentPath: router.asPath, timestamp: Date.now(), duration: `${duration}ms` });
        if (duration !== 'unknown') {
          const durationMs = parseFloat(duration);
          if (durationMs > 5000) {
            console.error('[PERF] 🔴 VERY SLOW NAVIGATION (>5s):', { url, duration: `${duration}ms` });
          } else if (durationMs > 2000) {
            console.warn('[PERF] 🟡 SLOW NAVIGATION (>2s):', { url, duration: `${duration}ms` });
          } else if (durationMs > 1000) {
            console.warn('[PERF] ⚠️ MODERATE SLOW NAVIGATION (>1s):', { url, duration: `${duration}ms` });
          }
        }
      }
      // #endregion
      setProgress(false);
    };
    const handleError = (err, url) => {
      const startTime = navigationTimes.get(url);
      const duration = startTime ? (performance.now() - startTime).toFixed(2) : 'unknown';
      navigationTimes.delete(url);
      // #region agent log
      if (process.env.NODE_ENV !== 'production') {
        console.error('[PERF] Route change ERROR:', { url, error: err?.message, stack: err?.stack, timestamp: Date.now(), duration: `${duration}ms` });
      }
      // #endregion
      setProgress(false);
    };
    
    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleComplete);
    Router.events.on('routeChangeError', handleError);
    
    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleComplete);
      Router.events.off('routeChangeError', handleError);
    };
  }, [router]);
  
  TopBarProgress.config(progressBarConfig());

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      const id = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
      if (id) {
        ReactGA.initialize(id);
        setGaEnabled(true);
      }
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (gaEnabled) {
        ReactGA.pageview(url);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, gaEnabled]);

  // #region agent log - Global error handler (console only, no network calls to avoid CORS)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const postDebug = (hypothesisId, message, data) => {
      try {
        fetch('/api/_debug/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'client-errors',
            hypothesisId,
            location: 'pages/_app.js',
            message,
            data,
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
    };

    // Catch unhandled JavaScript errors
    const handleError = (event) => {
      console.error('[GLOBAL ERROR]', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      });

      // #region agent log
      postDebug('CE_1', 'window.error', {
        message: event?.message ? String(event.message).slice(0, 200) : null,
        filename: event?.filename ? String(event.filename).slice(0, 120) : null,
        lineno: Number.isFinite(event?.lineno) ? event.lineno : null,
        colno: Number.isFinite(event?.colno) ? event.colno : null,
        stack: event?.error?.stack ? String(event.error.stack).slice(0, 400) : null,
      });
      // #endregion
    };
    
    // Catch unhandled promise rejections
    const handleRejection = (event) => {
      console.error('[PROMISE REJECTION]', {
        reason: event.reason?.toString(),
        error: event.reason?.stack,
      });

      // #region agent log
      postDebug('CE_2', 'unhandledrejection', {
        reason: event?.reason ? String(event.reason).slice(0, 200) : null,
        stack: event?.reason?.stack ? String(event.reason.stack).slice(0, 400) : null,
      });
      // #endregion
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  // #endregion

  return (
    <ErrorBoundary>
      <SessionProvider session={pageProps.session}>
        <SWRConfig value={swrOptions}>
          <ThemeProvider attribute="class">
            <WorkspaceProvider>
              {progress && <TopBarProgress />}
              <Component {...pageProps} />
            </WorkspaceProvider>
          </ThemeProvider>
        </SWRConfig>
      </SessionProvider>
    </ErrorBoundary>
  );
};

export default App;
