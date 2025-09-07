'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, Users, Server, LogOut, Plus, Trash2, UserPlus } from 'lucide-react'

export default function CosmosIntranet() {
  const [user, setUser] = useState(null)
  const [resources, setResources] = useState([])
  const [reservations, setReservations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  
  // Reservation form state
  const [reservationForm, setReservationForm] = useState({
    resourceId: '',
    date: '',
    startTime: '',
    duration: '1'
  })

  // User management form state
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'user'
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchUserProfile(token)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchResources()
      fetchReservations()
      if (user.role === 'admin') {
        fetchUsers()
      }
    }
  }, [user])

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      localStorage.removeItem('token')
    }
  }

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/resources', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const resourcesData = await response.json()
        setResources(resourcesData)
      }
    } catch (error) {
      console.error('Resources fetch error:', error)
    }
  }

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/reservations', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const reservationsData = await response.json()
        setReservations(reservationsData)
      }
    } catch (error) {
      console.error('Reservations fetch error:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const usersData = await response.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Users fetch error:', error)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        setSuccess('Login successful!')
        setLoginForm({ username: '', password: '' })
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setResources([])
    setReservations([])
    setUsers([])
  }

  const handleReservation = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reservationForm)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Reservation created successfully!')
        setReservationForm({ resourceId: '', date: '', startTime: '', duration: '1' })
        fetchReservations()
      } else {
        setError(data.error || 'Reservation failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('User created successfully!')
        setUserForm({ username: '', password: '', role: 'user' })
        fetchUsers()
      } else {
        setError(data.error || 'User creation failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReservation = async (reservationId) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        setSuccess('Reservation deleted successfully!')
        fetchReservations()
      } else {
        const data = await response.json()
        setError(data.error || 'Delete failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        setSuccess('User deleted successfully!')
        fetchUsers()
      } else {
        const data = await response.json()
        setError(data.error || 'Delete failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const getResourceIcon = (type) => {
    return type === 'meeting_room' ? <Users className="h-4 w-4" /> : <Server className="h-4 w-4" />
  }

  const formatDateTime = (date, startTime, duration) => {
    const start = new Date(`${date}T${startTime}:00`)
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000)
    
    return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6e6e6] via-[#ffdb8d] to-[#dbb979] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-[#461044]">Cosmos Intranet</CardTitle>
            <CardDescription>Resource Management System</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6e6e6] via-white to-[#ffdb8d]">
      <header className="bg-[#461044] text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="h-8 w-8 text-[#ffdb8d]" />
            <h1 className="text-2xl font-bold">🏛️ Cosmos Intranet</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-[#dbb979] text-[#461044]">
              {user.role === 'admin' ? 'Administrator' : 'User'}
            </Badge>
            <span className="text-sm">Welcome, {user.username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-[#ffdb8d] text-[#ffdb8d] hover:bg-[#ffdb8d] hover:text-[#461044]">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-[#dbb979] bg-[#ffdb8d]/10">
            <AlertDescription className="text-[#461044]">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="resources" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="resources">🏛️ Resources</TabsTrigger>
            <TabsTrigger value="reservations">📅 My Reservations</TabsTrigger>
            {user.role === 'admin' && <TabsTrigger value="admin">👑 Admin Panel</TabsTrigger>}
          </TabsList>

          <TabsContent value="resources" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-[#461044]">
                    <Calendar className="h-5 w-5 mr-2 text-[#dbb979]" />
                     Available Resources
                  </CardTitle>
                  <CardDescription>📅 Reserve meeting rooms and supercomputers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {resources.map((resource) => (
                      <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          {getResourceIcon(resource.type)}
                          <div>
                            <h3 className="font-semibold text-[#461044]">{resource.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {resource.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-[#dbb979] text-[#dbb979]">
                          ⚡ Available
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-[#461044]">
                    <Plus className="h-5 w-5 mr-2 text-[#dbb979]" />
                    Make Reservation
                  </CardTitle>
                  <CardDescription>Book a resource for your needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReservation} className="space-y-4">
                    <div>
                      <Label htmlFor="resource">Resource</Label>
                      <Select
                        value={reservationForm.resourceId}
                        onValueChange={(value) => setReservationForm({ ...reservationForm, resourceId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a resource" />
                        </SelectTrigger>
                        <SelectContent>
                          {resources.map((resource) => (
                            <SelectItem key={resource.id} value={resource.id}>
                              {resource.name} ({resource.type.replace('_', ' ')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={reservationForm.date}
                        onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={reservationForm.startTime}
                        onChange={(e) => setReservationForm({ ...reservationForm, startTime: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Select
                        value={reservationForm.duration}
                        onValueChange={(value) => setReservationForm({ ...reservationForm, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5">30 minutes</SelectItem>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      <Clock className="h-4 w-4 mr-2" />
                      {loading ? 'Booking...' : 'Make Reservation'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#461044]">
                  <Calendar className="h-5 w-5 mr-2 text-[#dbb979]" />
                  My Reservations
                </CardTitle>
                <CardDescription>Your active and upcoming reservations</CardDescription>
              </CardHeader>
              <CardContent>
                {reservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reservations found</p>
                ) : (
                  <div className="space-y-4">
                    {reservations.map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center space-x-4">
                          {getResourceIcon(reservation.resource?.type)}
                          <div>
                            <h3 className="font-semibold text-[#461044]">{reservation.resource?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(reservation.date, reservation.startTime, reservation.duration)}
                            </p>
                            <Badge variant="outline" className="mt-1 border-[#dbb979] text-[#dbb979]">
                              {reservation.duration} hour{reservation.duration !== '1' ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReservation(reservation.id)}
                          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {user.role === 'admin' && (
            <TabsContent value="admin" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#461044]">
                      <UserPlus className="h-5 w-5 mr-2 text-[#dbb979]" />
                      Create User
                    </CardTitle>
                    <CardDescription>Add new users to the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <Label htmlFor="newUsername">Username</Label>
                        <Input
                          id="newUsername"
                          type="text"
                          value={userForm.username}
                          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPassword">Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={userForm.role}
                          onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Creating...' : 'Create User'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#461044]">
                      <Users className="h-5 w-5 mr-2 text-[#dbb979]" />
                      User Management
                    </CardTitle>
                    <CardDescription>Manage system users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.map((userItem) => (
                        <div key={userItem.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                          <div>
                            <h3 className="font-semibold text-[#461044]">{userItem.username}</h3>
                            <Badge variant="outline" className="border-[#dbb979] text-[#dbb979]">
                              {userItem.role}
                            </Badge>
                          </div>
                          {userItem.username !== 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(userItem.id)}
                              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}