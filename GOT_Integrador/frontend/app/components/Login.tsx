// src/app/components/Login.tsx
import { useState } from 'react';
import { User, Mail, Lock, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (isLogin) {
      setLoading(true);
      try {
        const result = await api.login(formData.email, formData.password);
        console.log('✅ Login exitoso:', result);
        onLogin(formData.email, formData.password);
      } catch (err: any) {
        setError(err.message || 'Error al iniciar sesión');
        setLoading(false);
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      if (!formData.acceptTerms) {
        setError('Debes aceptar los términos y condiciones');
        return;
      }
      
      setLoading(true);
      try {
        const result = await api.register(formData.email, formData.name, formData.password);
        console.log('✅ Registro exitoso:', result);
        onLogin(formData.email, formData.password);
      } catch (err: any) {
        setError(err.message || 'Error al registrar usuario');
        setLoading(false);
      }
    }
  };

  const handleSocialLogin = (provider: string) => {
    onLogin(`user@${provider}.com`, 'social-login');
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#6B21A8] via-[#7C3AED] to-[#8B5CF6]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-20 right-40 w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-40 left-60 w-1.5 h-1.5 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 right-1/3 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-20 w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/4 right-1/2 w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }}></div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#2D1B4E]/90 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-purple-500/20">
          <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-2">
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </h1>
          <p className="text-center text-purple-200 text-sm mb-6">
            {isLogin ? 'Inicia sesión con' : 'Regístrate con'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1F1635] hover:bg-[#2A1F47] text-white py-2.5 px-4 rounded-xl transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-medium">GOOGLE</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1F1635] hover:bg-[#2A1F47] text-white py-2.5 px-4 rounded-xl transition"
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm font-medium">FACEBOOK</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-purple-200 text-sm mb-2">Nombre</label>
                <input
                  type="text"
                  placeholder="Tu Nombre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1F1635] border-none text-white placeholder-purple-300/50 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-purple-200 text-sm mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/50" />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#1F1635] border-none text-white placeholder-purple-300/50 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-purple-200 text-sm mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/50" />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#1F1635] border-none text-white placeholder-purple-300/50 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-purple-200 text-sm mb-2">Confirmar Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/50" />
                    <input
                      type="password"
                      placeholder="Confirmar Contraseña"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full bg-[#1F1635] border-none text-white placeholder-purple-300/50 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded bg-[#1F1635] border-purple-500/30 accent-purple-500"
                    required={!isLogin}
                  />
                  <label htmlFor="terms" className="text-purple-200 text-xs">
                    Acepto la política de privacidad y los términos y condiciones
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] hover:from-[#6D28D9] hover:to-[#8B5CF6] text-white py-3 rounded-xl font-semibold shadow-lg transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-200 hover:text-white text-sm transition"
            >
              {isLogin ? "¿No tienes cuenta? " : '¿Ya tienes cuenta? '}
              <span className="font-semibold underline">
                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}