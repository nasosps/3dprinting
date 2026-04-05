import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Quotes from './pages/Quotes'
import Materials from './pages/Materials'
import Customers from './pages/Customers'
import Accessories from './pages/Accessories'
import Models from './pages/Models'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

function AuthGate() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      queryClient.clear()
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // loading

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/accessories" element={<Accessories />} />
        <Route path="/models" element={<Models />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  )
}
