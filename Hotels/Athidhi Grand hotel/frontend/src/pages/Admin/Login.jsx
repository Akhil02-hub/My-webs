import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/SEO';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <SEO title="Admin Login" />
      <div className="bg-white shadow-sm rounded-xl p-6">
        <h1 className="text-3xl text-center mb-6">Admin Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" autoComplete="username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} minLength={3} maxLength={50} required className="w-full border p-3 rounded-lg" />
          <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} maxLength={200} required className="w-full border p-3 rounded-lg" />
          {error && <p className="text-red-600" role="alert">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full bg-charcoal text-white py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50">{submitting ? 'Signing in…' : 'Login'}</button>
        </form>
      </div>
    </div>
  );
}
