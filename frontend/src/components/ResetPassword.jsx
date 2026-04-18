import { useState } from 'react';
import { api } from '../api';

export default function ResetPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.resetPassword(email, newPassword);
      setSuccess('Password updated! You can now log in with your new password.');
    } catch (err) {
      setError(err.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display font-light text-white italic mb-2">Noted 📓</h1>
        </div>

        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-display text-white mb-2">Reset Password</h2>
          <p className="text-ink-muted text-sm mb-6">Enter your email and a new password to reset it instantly.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1.5 ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded-xl p-3 text-white outline-none focus:border-accent/50 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1.5 ml-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded-xl p-3 text-white outline-none focus:border-accent/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-surface-0 font-bold py-3 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 mt-2"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <button
            onClick={onBack}
            className="w-full mt-6 text-sm text-ink-faint hover:text-white transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
