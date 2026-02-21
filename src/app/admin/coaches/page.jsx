'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCoaches, useCreateCoach, useDeleteCoach } from '@/hooks/useCoaches'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, UserPlus, CheckCircle, XCircle, Users, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminCoachesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showCreateCoach, setShowCreateCoach] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newCoach, setNewCoach] = useState({ 
    name: '', 
    bio: '', 
    specialization: '',
    email: '',
    user_id: ''
  })

  const { data: coaches, isLoading: loadingCoaches } = useCoaches()
  const createCoach = useCreateCoach()
  const deleteCoach = useDeleteCoach()

  // Check admin auth
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: coach } = await supabase
        .from('coaches')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (!coach?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
      setIsLoading(false)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }

  // Fetch all users
  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      
      console.log('fetchUsers response:', data)
      
      if (data.error) {
        console.error('API returned error:', data)
        toast.error(`${data.error}${data.details ? ': ' + data.details : ''}`)
      }
      
      setUsers(data.users || [])
    } catch (error) {
      toast.error('Failed to load users')
      console.error('fetchUsers error:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleCreateCoach = async (e) => {
    e.preventDefault()
    console.log('Creating coach with data:', newCoach, 'selectedUser:', selectedUser)
    
    if (!newCoach.name.trim()) {
      toast.error('Coach name is required')
      return
    }
    
    try {
      const result = await createCoach.mutateAsync({
        name: newCoach.name.trim(),
        bio: newCoach.bio?.trim() || null,
        specialization: newCoach.specialization?.trim() || null,
        email: newCoach.email?.trim() || null,
        user_id: selectedUser?.id || null
      })
      console.log('Coach created:', result)
      toast.success('Coach created successfully!')
      setNewCoach({ name: '', bio: '', specialization: '', email: '', user_id: '' })
      setSelectedUser(null)
      setShowCreateCoach(false)
      // Refresh to show new coach
      window.location.reload()
    } catch (error) {
      console.error('Failed to create coach:', error)
      toast.error('Failed to create coach: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDeleteCoach = async (id) => {
    if (!confirm('Are you sure you want to delete this coach?')) return
    try {
      await deleteCoach.mutateAsync(id)
      toast.success('Coach deleted')
    } catch (error) {
      toast.error('Failed to delete coach')
    }
  }

  const handleToggleAdmin = async (coach) => {
    try {
      const { error } = await supabase
        .from('coaches')
        .update({ is_admin: !coach.is_admin })
        .eq('id', coach.id)
      
      if (error) throw error
      toast.success(`Admin status ${coach.is_admin ? 'removed' : 'granted'}`)
      window.location.reload()
    } catch (error) {
      toast.error('Failed to update admin status')
    }
  }

  const handleLinkUser = async (coach, userId) => {
    console.log('Linking coach:', coach.id, 'to user:', userId)
    
    if (!userId) {
      console.log('No userId provided, skipping')
      return
    }
    
    try {
      // Update without select() to avoid RLS issues
      const { data, error } = await supabase
        .from('coaches')
        .update({ user_id: userId })
        .eq('id', coach.id)
        .select()
      
      console.log('Update result:', { data, error })
      
      if (error) {
        console.error('Link error:', error)
        throw error
      }
      
      if (!data || data.length === 0) {
        console.warn('No rows updated - RLS might be blocking')
        toast.error('Could not link user - check permissions')
        return
      }
      
      console.log('Link successful:', data)
      toast.success('User linked to coach successfully!')
      
      // Force refresh coaches data
      await queryClient.invalidateQueries({ queryKey: ['coaches'] })
      await queryClient.refetchQueries({ queryKey: ['coaches'] })
      
      // Also refresh users to update unlinked list
      await fetchUsers()
    } catch (error) {
      console.error('Failed to link user:', error)
      toast.error('Failed to link user: ' + (error.message || 'Unknown error'))
    }
  }

  // Filter users who are not already coaches
  const unlinkedUsers = users.filter(user => 
    !coaches?.some(coach => coach.user_id === user.id)
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5EFE7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#5E5044] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5EFE7]">
        <header className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-black">Manage Coaches & Users</h1>
            <p className="text-gray-600">Assign users as coaches and manage permissions</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="coaches" className="space-y-6">
            <TabsList className="bg-white">
              <TabsTrigger value="coaches" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Crown className="mr-2 h-4 w-4" />
                Coaches ({coaches?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <Users className="mr-2 h-4 w-4" />
                All Users ({users.length})
              </TabsTrigger>
              <TabsTrigger value="unlinked" className="data-[state=active]:bg-[#5E5044] data-[state=active]:text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Unlinked Users ({unlinkedUsers.length})
              </TabsTrigger>
            </TabsList>

            {/* Coaches Tab */}
            <TabsContent value="coaches">
              <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-black">Coaches</CardTitle>
                  <Button 
                    onClick={() => setShowCreateCoach(true)}
                    className="bg-[#5E5044] hover:bg-[#4a3f35]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Coach
                  </Button>
                </CardHeader>
                <CardContent>
                  {showCreateCoach && (
                    <form onSubmit={handleCreateCoach} className="mb-6 p-4 bg-[#F5EFE7] rounded-lg space-y-4">
                      <div>
                        <Label className="text-black">Coach Name</Label>
                        <Input
                          value={newCoach.name}
                          onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                          placeholder="e.g., Coach Akintoye"
                          required
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Specialization</Label>
                        <Input
                          value={newCoach.specialization}
                          onChange={(e) => setNewCoach({ ...newCoach, specialization: e.target.value })}
                          placeholder="e.g., Beginner Training"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Bio</Label>
                        <Textarea
                          value={newCoach.bio}
                          onChange={(e) => setNewCoach({ ...newCoach, bio: e.target.value })}
                          placeholder="Brief bio..."
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-black">Email (for notifications)</Label>
                        <Input
                          type="email"
                          value={newCoach.email}
                          onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                          placeholder="coach@example.com"
                          className="bg-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Used to send booking notifications
                        </p>
                      </div>
                      <div>
                        <Label className="text-black">Link to User (Optional)</Label>
                        <select
                          value={selectedUser?.id || ''}
                          onChange={(e) => {
                            const user = unlinkedUsers.find(u => u.id === e.target.value)
                            setSelectedUser(user || null)
                          }}
                          className="w-full px-3 py-2 border rounded-lg bg-white"
                        >
                          <option value="">-- Select a user --</option>
                          {unlinkedUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.email} {user.user_metadata?.full_name ? `(${user.user_metadata.full_name})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Linking a user allows them to log in as this coach
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="bg-[#5E5044]">Create Coach</Button>
                        <Button type="button" variant="outline" onClick={() => setShowCreateCoach(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {loadingCoaches ? (
                    <div className="animate-pulse h-32 bg-gray-200 rounded" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Linked User</TableHead>
                          <TableHead>Specialization</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coaches?.map((coach) => (
                          <TableRow key={coach.id}>
                            <TableCell>
                              <div className="font-medium text-black">{coach.name}</div>
                            </TableCell>
                            <TableCell>
                              {coach.email ? (
                                <span className="text-sm text-gray-600">{coach.email}</span>
                              ) : (
                                <span className="text-sm text-gray-400 italic">No email</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {coach.user_id ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-gray-600">
                                    {users.find(u => u.id === coach.user_id)?.email || 'Linked'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-400" />
                                    <span className="text-sm text-gray-400">Not linked</span>
                                  </div>
                                  {unlinkedUsers.length > 0 ? (
                                    <select
                                      className="text-xs border rounded px-2 py-1 w-full max-w-[200px]"
                                      onChange={(e) => {
                                        const userId = e.target.value
                                        if (userId) {
                                          handleLinkUser(coach, userId)
                                          e.target.value = '' // Reset after selection
                                        }
                                      }}
                                      value=""
                                    >
                                      <option value="">-- Link to user --</option>
                                      {unlinkedUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                          {user.email}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-gray-400">No unlinked users</span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-600">{coach.specialization || '-'}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={coach.is_admin ? "default" : "secondary"}
                                className={coach.is_admin ? "bg-purple-600" : ""}
                              >
                                {coach.is_admin ? 'Admin' : 'Coach'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleAdmin(coach)}
                                  className={coach.is_admin ? "text-red-600" : "text-purple-600"}
                                >
                                  {coach.is_admin ? 'Remove Admin' : 'Make Admin'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteCoach(coach.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Users Tab */}
            <TabsContent value="users">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-black">All Registered Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="animate-pulse h-32 bg-gray-200 rounded" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => {
                          const coach = coaches?.find(c => c.user_id === user.id)
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium text-black">{user.email}</TableCell>
                              <TableCell>{user.user_metadata?.full_name || '-'}</TableCell>
                              <TableCell className="text-gray-500">
                                {new Date(user.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {coach ? (
                                  <Badge className={coach.is_admin ? "bg-purple-600" : "bg-[#5E5044]"}>
                                    {coach.is_admin ? 'Admin' : 'Coach'}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Student</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Unlinked Users Tab */}
            <TabsContent value="unlinked">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-black">Users Without Coach Profile</CardTitle>
                  <p className="text-sm text-gray-500">
                    These users can be linked to coach profiles
                  </p>
                </CardHeader>
                <CardContent>
                  {unlinkedUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      All users are linked to coaches.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unlinkedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium text-black">{user.email}</TableCell>
                            <TableCell>{user.user_metadata?.full_name || '-'}</TableCell>
                            <TableCell className="text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setNewCoach({ ...newCoach, user_id: user.id })
                                  setShowCreateCoach(true)
                                }}
                                className="bg-[#5E5044]"
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Create Coach
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Footer />
    </>
  )
}
