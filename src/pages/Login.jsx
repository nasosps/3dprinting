import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-white">Psaradakis<span className="text-violet-400">3D</span></div>
        </div>

        <form onSubmit={handleLogin} className="bg-[#1a1a1f] rounded-2xl p-6 border border-[#2e2e38] space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Κωδικός</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition text-sm"
          >
            {loading ? 'Σύνδεση...' : 'Είσοδος'}
          </button>
        </form>
      </div>
    </div>
  )
}
