'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Users, Vote, TrendingUp, Download, Calendar, Award } from 'lucide-react'

interface Analytics {
  overview: {
    totalVoters: number
    votedCount: number
    notVotedCount: number
    votingPercentage: number
    totalPolls: number
    activePolls: number
    totalVotes: number
  }
  votersByYear: Array<{ _id: string, total: number, voted: number }>
  votersByDepartment: Array<{ _id: string, total: number, voted: number }>
  votersByYearSection: Array<{ _id: { year: string, section: string }, total: number, voted: number }>
  votingTrends: Array<{ _id: string, count: number }>
  pollActivity: Array<{ title: string, voteCount: number, targetYear: string, targetSection: string }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (type: string) => {
    try {
      const response = await fetch(`/api/admin/export?type=${type}&format=xlsx`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}_export.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Export failed')
      }
    } catch (error) {
      alert('Export failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p>Failed to load analytics</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive voting system analytics and insights</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportData('voters')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Voters
            </Button>
            <Button onClick={() => exportData('results')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
            <Button onClick={() => exportData('detailed-votes')} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Detailed Votes
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Voters</p>
                  <p className="text-3xl font-bold">{analytics.overview.totalVoters}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Votes Cast</p>
                  <p className="text-3xl font-bold">{analytics.overview.votedCount}</p>
                  <p className="text-sm text-green-600">{analytics.overview.votingPercentage}% turnout</p>
                </div>
                <Vote className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Polls</p>
                  <p className="text-3xl font-bold">{analytics.overview.activePolls}</p>
                  <p className="text-sm text-gray-500">of {analytics.overview.totalPolls} total</p>
                </div>
                <Award className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Votes</p>
                  <p className="text-3xl font-bold">{analytics.overview.totalVotes}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Voting Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall Voting Progress</CardTitle>
            <CardDescription>Current voting participation across all voters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Voted: {analytics.overview.votedCount}</span>
                <span>Not Voted: {analytics.overview.notVotedCount}</span>
              </div>
              <Progress value={analytics.overview.votingPercentage} className="h-3" />
              <p className="text-center text-lg font-semibold">
                {analytics.overview.votingPercentage}% Participation Rate
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Voters by Year */}
          <Card>
            <CardHeader>
              <CardTitle>Voters by Academic Year</CardTitle>
              <CardDescription>Distribution and participation by year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.votersByYear}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8884d8" name="Total Voters" />
                  <Bar dataKey="voted" fill="#82ca9d" name="Voted" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Voters by Department */}
          <Card>
            <CardHeader>
              <CardTitle>Voters by Branch</CardTitle>
              <CardDescription>Branch-wise voter distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.votersByDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, total }) => `${_id}: ${total}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {analytics.votersByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Voting Trends */}
        {analytics.votingTrends.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Voting Trends (Last 30 Days)</CardTitle>
              <CardDescription>Daily voting activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.votingTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Year-Section Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detailed Breakdown by Year and Section</CardTitle>
            <CardDescription>Voting participation across all year-section combinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.votersByYearSection.map((group) => (
                <Card key={`${group._id.year}-${group._id.section}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">Year {group._id.year} - Section {group._id.section}</h4>
                      <Badge variant="outline">
                        {Math.round((group.voted / group.total) * 100)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total: {group.total}</span>
                        <span>Voted: {group.voted}</span>
                      </div>
                      <Progress value={(group.voted / group.total) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Active Polls */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Polls</CardTitle>
            <CardDescription>Polls with highest participation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.pollActivity.map((poll, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{poll.title}</h4>
                    <p className="text-sm text-gray-600">
                      Year {poll.targetYear} {poll.targetSection === 'ALL' ? '(All Sections)' : `Section ${poll.targetSection}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{poll.voteCount}</p>
                    <p className="text-sm text-gray-600">votes</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
