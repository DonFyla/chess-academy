'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Calendar, User } from 'lucide-react'

export default function CoachPortalPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user)
    })
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      toast.success('Logged in successfully!')
      setUser(data.user)
      router.push('/coach/availability')
    } catch (error) {
      toast.error(`Login failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    toast.success('Logged out')
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7] py-12">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="bg-white">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-black">Coach Portal</CardTitle>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-[#F5EFE7] rounded-lg">
                    <User className="h-8 w-8 text-[#5E5044]" />
                    <div>
                      <p className="font-medium text-black">Logged in as</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <Link href="/coach/availability">
                    <Button className="w-full bg-[#5E5044] hover:bg-[#4a3f35] mb-3">
                      <Calendar className="mr-2 h-4 w-4" />
                      Manage My Availability
                    </Button>
                  </Link>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="w-full"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-black">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="coach@example.com"
                      required
                      className="border-gray-300"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-black">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="border-gray-300"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-[#5E5044] hover:bg-[#4a3f35]"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                  
                  <p className="text-sm text-gray-500 text-center">
                    Don&apos;t have an account? Contact the admin.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  )
}
