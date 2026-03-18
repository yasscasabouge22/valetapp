import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Shield, Info } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export function UserLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep]       = useState('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState(['','','','','','']);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [demoCode, setDemoCode] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSend = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.sendOTP(phone);
      setStep('otp'); setCountdown(60);
      if (res._demo_code) setDemoCode(res._demo_code);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.verifyOTP(phone, code);
      await login(token, user);
      navigate('/user/scan');
    } catch(err) {
      setError(err.message);
      setOtp(['','','','','','']);
      document.getElementById('otp-0')?.focus();
    }
    finally { setLoading(false); }
  };

  const otpFull = otp.every(d => d !== '');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => step === 'otp' ? (setStep('phone'), setOtp(['','','','','',''])) : navigate('/')}
            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-gray-900">Connexion Voiturier</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl flex items-center justify-center shadow-lg">
              {step === 'phone' ? <Phone className="w-9 h-9 text-white" /> : <Shield className="w-9 h-9 text-white" />}
            </div>
          </div>

          {/* Hint démo */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-semibold mb-0.5">Numéros de démo :</p>
              <p>+212611223344 · +212622334455 · +212633445566</p>
            </div>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Votre numéro</h2>
                <p className="text-sm text-gray-500 mt-1">Vous recevrez un code par SMS</p>
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+212 6 XX XX XX XX" required
                  className="w-full pl-11 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <button type="submit" disabled={!phone || loading}
                className="w-full py-4 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-100">
                {loading ? 'Envoi…' : 'Recevoir le code SMS'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Vérification</h2>
                <p className="text-sm text-gray-500 mt-1">Code envoyé au <span className="font-semibold text-emerald-600">{phone}</span></p>
              </div>

              {demoCode && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 font-semibold mb-1">Code de démonstration :</p>
                  <p className="text-2xl font-bold font-mono text-blue-800 tracking-widest">{demoCode}</p>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                {otp.map((d, i) => (
                  <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl transition-all focus:outline-none ${d ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white'} focus:border-emerald-500`} />
                ))}
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <button type="submit" disabled={!otpFull || loading}
                className="w-full py-4 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-100">
                {loading ? 'Vérification…' : 'Se connecter'}
              </button>

              <div className="text-center">
                {countdown > 0
                  ? <p className="text-sm text-gray-400">Renvoyer dans <span className="font-bold text-gray-700">{countdown}s</span></p>
                  : <button type="button" onClick={handleSend} className="text-sm text-emerald-600 font-semibold hover:underline">Renvoyer le code</button>}
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
