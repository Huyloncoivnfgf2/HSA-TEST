import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../services/supabaseClient';
import { initializeUserData, stopUserDataSync } from '../services/userDataSync';
import { getStorageUserId, setStorageUserId, setUserStorageValue } from '../services/userStorage';
import { migrateAnonymousDatabase, resetUserDatabase } from '../services/indexedDbService';
import type { ReactNode } from 'react';

interface AuthGateProps {
  children: (user: User, isAdmin: boolean, signOut: () => void) => ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [accessCheckFailed, setAccessCheckFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      stopUserDataSync();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      stopUserDataSync();
      setIsAdmin(false);
      setIsAllowed(false);
      return;
    }
    stopUserDataSync();
    setReady(false);
    setIsAdmin(false);
    setIsAllowed(false);
    setAccessCheckFailed(false);
    void (async () => {
      try {
        const { data: allowed, error: allowedError } = await supabase!.rpc('is_allowed');
        if (allowedError) throw allowedError;
        if (!active) return;
        setIsAllowed(Boolean(allowed));
        if (!allowed) {
          setIsAdmin(false);
          setReady(true);
          return;
        }
        const { data: admin, error: adminError } = await supabase!.rpc('is_admin');
        if (adminError) throw adminError;
        if (!active) return;
        await resetUserDatabase();
        if (!active) return;
        setStorageUserId(session.user.id);
        if (localStorage.getItem('hsa_user_scope_migrated_v1') !== 'true') {
          const legacy = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
            .filter((key): key is string => Boolean(key?.startsWith('hsa_')))
            .map((key) => [key, localStorage.getItem(key)!] as const);
          for (const [key, value] of legacy) setUserStorageValue(key, value);
          await migrateAnonymousDatabase();
          if (!active) return;
          localStorage.setItem('hsa_user_scope_migrated_v1', 'true');
        }
        await initializeUserData(session.user);
        if (!active) return;
        setIsAdmin(Boolean(admin));
        setReady(true);
      } catch (authorizationError: unknown) {
        console.error('Could not verify account access or initialize user data:', authorizationError);
        if (active) {
          setIsAllowed(false);
          setIsAdmin(false);
          setAccessCheckFailed(true);
          setError('Không thể xác minh quyền truy cập. Hãy kiểm tra kết nối hoặc liên hệ chủ web.');
          setReady(true);
        }
      }
    })();
    return () => { active = false; };
  }, [session?.user.id]);

  if (!supabaseConfigured) {
    return <AuthScreen error="Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong cấu hình môi trường." />;
  }
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Đang tải phiên đăng nhập…</div>;
  }
  if (session?.user && isAllowed && getStorageUserId() !== session.user.id) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Đang tải dữ liệu tài khoản…</div>;
  }
  if (!session?.user) {
    return <AuthScreen error={error} onSignIn={async () => {
      setBusy(true);
      setError(null);
      try {
        const { error: signInError } = await supabase!.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (signInError) setError(signInError.message);
      } catch (signInError) {
        console.error('Could not start Google sign-in:', signInError);
        setError('Không thể bắt đầu đăng nhập Google. Hãy thử lại.');
      } finally {
        setBusy(false);
      }
    }} busy={busy} />;
  }
  const handleSignOut = async () => {
    const { error: signOutError } = await supabase!.auth.signOut();
    if (signOutError) {
      console.error('Could not sign out:', signOutError);
      setError('Không thể đăng xuất. Hãy thử lại.');
    }
  };
  if (!isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {accessCheckFailed ? 'Không thể xác minh quyền truy cập.' : 'Tài khoản chưa được cấp quyền.'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {accessCheckFailed ? 'Hãy kiểm tra kết nối hoặc thử đăng nhập lại.' : 'Hãy gửi email Google của bạn cho chủ web.'}
          </p>
          <p className="mt-3 break-all rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold dark:bg-slate-800">{session.user.email}</p>
          {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
          <button type="button" onClick={() => void handleSignOut()} className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Đăng xuất</button>
        </section>
      </main>
    );
  }
  return (
    <div key={session.user.id}>
      {error && <p role="alert" className="fixed bottom-3 left-3 z-50 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900">{error}</p>}
      {children(session.user, isAdmin, () => { void handleSignOut(); })}
    </div>
  );
}

function AuthScreen({ error, onSignIn, busy = false }: {
  error?: string | null;
  onSignIn?: () => void;
  busy?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">HSA ĐHQGHN</h1>
        <p className="mt-2 text-sm text-slate-500">Đăng nhập để tiếp tục học tập</p>
        {onSignIn && <button type="button" disabled={busy} onClick={onSignIn} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Đang chuyển đến Google…' : 'Đăng nhập bằng Google'}</button>}
        {error && <p role="alert" className="mt-4 break-words text-xs text-rose-600">{error}</p>}
      </section>
    </main>
  );
}
