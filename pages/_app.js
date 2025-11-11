import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import { useEffect } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
// Google Fonts are provided from pages/_document.js per Next.js guidance.

// Synchronously initialize dev bypass values on the client before React mounts
// This reduces the chance of client-side auth checks redirecting before
// the fake user is injected. We compute a client-side bypass flag that
// is robust in dev: it respects NEXT_PUBLIC_DEV_BYPASS (injected by Next)
// and falls back to localhost hostname when running locally.
if (typeof window !== 'undefined') {
  try {
    const isDev = (process && process.env && process.env.NODE_ENV === 'development') || false;
    const envBypass = (process && process.env && (process.env.NEXT_PUBLIC_DEV_BYPASS === '1' || process.env.NEXT_PUBLIC_DEV_BYPASS === 'true')) || false;
    const hostBypass = typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname.includes('localhost');
    const bypass = isDev && (envBypass || hostBypass);

    if (bypass) {
      // Ensure localStorage keys exist synchronously
      try {
        if (!localStorage.getItem('user_id')) {
          localStorage.setItem('user_id', 'dev-user');
        }
        if (!localStorage.getItem('user_name')) {
          localStorage.setItem('user_name', 'Dev User');
        }
        if (!localStorage.getItem('user_email')) {
          localStorage.setItem('user_email', 'dev@local');
        }
      } catch (e) {
        // localStorage may be unavailable in some contexts
      }

      // Monkeypatch Storage.getItem so synchronous reads see the dev values
      try {
        const origGet = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key) {
          if (key === 'user_id' || key === 'user_name' || key === 'user_email') {
            try {
              const val = origGet.call(this, key);
              if (val === null || val === undefined) {
                if (key === 'user_id') return 'dev-user';
                if (key === 'user_name') return 'Dev User';
                if (key === 'user_email') return 'dev@local';
              }
              return val;
            } catch (e) {
              // fallback to dev values if read fails
              if (key === 'user_id') return 'dev-user';
              if (key === 'user_name') return 'Dev User';
              if (key === 'user_email') return 'dev@local';
            }
          }
          return origGet.call(this, key);
        };
      } catch (e) {
        // ignore if monkeypatching is not allowed in environment
      }
    }
  } catch (e) {
    // noop
  }
}

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Import Bootstrap JS on client side
    import('bootstrap/dist/js/bootstrap.bundle.min.js');

    // Dev bypass: when NEXT_PUBLIC_DEV_BYPASS is truthy, auto-set a dummy
    // authenticated user in localStorage so all pages that check for
    // 'user_id' / 'user_name' will behave as if logged in.
    // This runs only on the client and is intended for local development.
    try {
      const env = typeof process !== 'undefined' ? process.env : {};
      const bypass = env.NEXT_PUBLIC_DEV_BYPASS === '1' || env.NEXT_PUBLIC_DEV_BYPASS === 'true';
      const isDev = env.NODE_ENV === 'development';

      if (bypass && isDev && typeof window !== 'undefined') {
        // Only set defaults if not already present to avoid stomping real data
        if (!localStorage.getItem('user_id')) {
          localStorage.setItem('user_id', 'dev-user');
        }
        if (!localStorage.getItem('user_name')) {
          localStorage.setItem('user_name', 'Dev User');
        }
        if (!localStorage.getItem('user_email')) {
          localStorage.setItem('user_email', 'dev@local');
        }
      }
    } catch (e) {
      // swallow errors to avoid breaking the app in weird environments
      // eslint-disable-next-line no-console
      console.warn('Dev bypass initialization failed', e);
    }
  }, []);

  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
