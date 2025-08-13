'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Vote, Users, Settings } from 'lucide-react'

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'admin' | 'voter'>('voter')
  const [credentials, setCredentials] = useState({ email: '', password: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, type: loginType })
      })
      
      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userType', loginType)
        window.location.href = loginType === 'admin' ? '/admin' : '/voter'
      } else {
        alert(data.message || 'Login failed')
      }
    } catch (error) {
      alert('Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Vote className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Voting System</CardTitle>
          <CardDescription>Secure Electronic Voting Platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginType} onValueChange={(value) => setLoginType(value as 'admin' | 'voter')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="voter" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Voter
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Admin
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="voter" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voter-email">Email</Label>
                  <Input
                    id="voter-email"
                    type="email"
                    placeholder="Enter your email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voter-password">Password</Label>
                  <Input
                    id="voter-password"
                    type="password"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Login as Voter
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="admin" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="Enter admin email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Login as Admin
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
