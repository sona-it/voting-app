'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, Users, Vote, BarChart3, Mail, Eye, EyeOff, Trash2, Edit, Plus, UserX, Filter, RefreshCw, Send, Key, CheckSquare, Square, MoreHorizontal, TrendingUp, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from 'next/link'

interface Voter {
  _id: string
  regNo: string
  name: string
  email: string
  year: string
  section: string
  department: string
  password: string
  hasVoted: boolean
}

interface VoterGroup {
  year: string
  section?: string
  department: string
  voters: Voter[]
  totalCount: number
  votedCount: number
  sections?: string[]
}

interface Poll {
  _id: string
  title: string
  description: string
  targetYear: string
  targetSection: string
  candidates: string[]
  isActive: boolean
  votes: any[]
  eligibleVotersCount: number
}

const VOTERS_PER_PAGE = 10

export default function AdminDashboard() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [voterGroups, setVoterGroups] = useState<VoterGroup[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({})
  const [viewMode, setViewMode] = useState<'individual' | 'year-section' | 'year'>('year-section')
  const [filters, setFilters] = useState({ year: 'all', section: 'all', department: '' })
  const [selectedVoters, setSelectedVoters] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [groupPagination, setGroupPagination] = useState<{[key: string]: number}>({})
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null)
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    targetYear: '',
    targetSection: '',
    targetDepartment: '',
    candidates: ['']
  })

  useEffect(() => {
    fetchVoters()
    fetchPolls()
  }, [viewMode, filters])

  const fetchVoters = async () => {
    try {
      const params = new URLSearchParams()
      if (viewMode !== 'individual') params.append('groupBy', viewMode)
      if (filters.year && filters.year !== 'all') params.append('year', filters.year)
      if (filters.section && filters.section !== 'all') params.append('section', filters.section)
      if (filters.department) params.append('department', filters.department)

      const response = await fetch(`/api/admin/voters?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      
      if (data.success) {
        if (viewMode === 'individual') {
          setVoters(data.voters)
          setVoterGroups([])
        } else {
          setVoterGroups(data.groups)
          setVoters([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch voters:', error)
    }
  }

  const fetchPolls = async () => {
    try {
      const response = await fetch('/api/admin/polls', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) setPolls(data.polls)
    } catch (error) {
      console.error('Failed to fetch polls:', error)
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedVoters.length === 0 && !filters.year && !filters.section && !filters.department) {
      alert('Please select voters or apply filters')
      return
    }

    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/admin/voters/bulk-actions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action, 
          voterIds: selectedVoters.length > 0 ? selectedVoters : null,
          filters: selectedVoters.length === 0 ? filters : null
        })
      })
      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        setSelectedVoters([])
        fetchVoters()
      } else {
        alert(data.message || 'Action failed')
      }
    } catch (error) {
      alert('Action failed')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/upload-voters', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      const data = await response.json()
      if (data.success) {
        alert(`Successfully added ${data.count} voters`)
        fetchVoters()
      } else {
        alert(data.message || 'Upload failed')
      }
    } catch (error) {
      alert('Upload failed')
    }
  }

  const deleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/admin/voters/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        alert(data.message)
        fetchVoters()
      } else {
        alert(data.message || 'Failed to delete group')
      }
    } catch (error) {
      alert('Failed to delete group')
    }
  }

  const deletePoll = async (pollId: string) => {
    try {
      const response = await fetch(`/api/admin/polls/${pollId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        alert(data.message)
        fetchPolls()
      } else {
        alert(data.message || 'Failed to delete poll')
      }
    } catch (error) {
      alert('Failed to delete poll')
    }
  }

  const updatePoll = async () => {
    if (!editingPoll) return
    
    try {
      const response = await fetch(`/api/admin/polls/${editingPoll._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingPoll)
      })
      const data = await response.json()
      if (data.success) {
        alert('Poll updated successfully')
        setEditingPoll(null)
        fetchPolls()
      } else {
        alert(data.message || 'Failed to update poll')
      }
    } catch (error) {
      alert('Failed to update poll')
    }
  }

  const createPoll = async () => {
    // Validate required fields
    if (!newPoll.title.trim() || !newPoll.description.trim() || !newPoll.targetYear || !newPoll.targetSection || !newPoll.targetDepartment || newPoll.candidates.some(c => !c.trim())) {
      alert('Please fill all poll fields including department, year, section, and candidates.')
      return
    }
    try {
      const response = await fetch('/api/admin/polls', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPoll)
      })
      const data = await response.json()
      if (data.success) {
        alert(`Poll created successfully! Eligible voters: ${data.eligibleVotersCount}`)
        setNewPoll({ title: '', description: '', targetYear: '', targetSection: '', targetDepartment: '', candidates: [''] })
        fetchPolls()
      } else {
        alert(data.message || 'Failed to create poll')
      }
    } catch (error) {
      alert('Failed to create poll')
    }
  }

  const togglePoll = async (pollId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/polls/${pollId}/toggle`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })
      const data = await response.json()
      if (data.success) {
        fetchPolls()
      }
    } catch (error) {
      alert('Failed to toggle poll')
    }
  }

  const toggleVoterSelection = (voterId: string) => {
    setSelectedVoters(prev => 
      prev.includes(voterId) 
        ? prev.filter(id => id !== voterId)
        : [...prev, voterId]
    )
  }

  const selectAllVoters = () => {
    if (viewMode === 'individual') {
      setSelectedVoters(voters.map(v => v._id))
    } else {
      const allVoterIds = voterGroups.flatMap(group => group.voters.map(v => v._id))
      setSelectedVoters(allVoterIds)
    }
  }

  const clearSelection = () => {
    setSelectedVoters([])
  }

  // Filter voters based on search term
  const filterVoters = (votersList: Voter[]) => {
    if (!searchTerm) return votersList
    
    return votersList.filter(voter => 
      voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.regNo.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Get paginated voters for a group
  const getPaginatedVoters = (groupKey: string, votersList: Voter[]) => {
    const filteredVoters = filterVoters(votersList)
    const currentPage = groupPagination[groupKey] || 0
    const startIndex = currentPage * VOTERS_PER_PAGE
    const endIndex = startIndex + VOTERS_PER_PAGE
    
    return {
      voters: filteredVoters.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredVoters.length / VOTERS_PER_PAGE),
      currentPage,
      totalFiltered: filteredVoters.length,
      totalOriginal: votersList.length
    }
  }

  const changePage = (groupKey: string, newPage: number) => {
    setGroupPagination(prev => ({
      ...prev,
      [groupKey]: newPage
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage voters, polls, and election results</p>
          </div>
          <Link href="/admin/analytics">
            <Button variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="voters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="voters" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Voters
            </TabsTrigger>
            <TabsTrigger value="polls" className="flex items-center gap-2">
              <Vote className="w-4 h-4" />
              Polls
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="create-poll" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Poll
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voter Management</CardTitle>
                <CardDescription>Upload and manage voter information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="excel-upload">Upload Excel File</Label>
                    <Input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Expected columns: reg_no, name, email, year, section, dept
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Voters Management</CardTitle>
                    <CardDescription>View and manage voters by groups or individually</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year-section">Group by Year & Section</SelectItem>
                        <SelectItem value="year">Group by Year</SelectItem>
                        <SelectItem value="individual">Individual View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="space-y-4 mb-6">
                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <Label>Filters:</Label>
                    </div>
                    <Select value={filters.year} onValueChange={(value) => setFilters({...filters, year: value})}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.section} onValueChange={(value) => setFilters({...filters, section: value})}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        <SelectItem value="A">Section A</SelectItem>
                        <SelectItem value="B">Section B</SelectItem>
                        <SelectItem value="C">Section C</SelectItem>
                        <SelectItem value="D">Section D</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Department"
                      value={filters.department}
                      onChange={(e) => setFilters({...filters, department: e.target.value})}
                      className="w-32"
                    />
                    <Button variant="outline" onClick={() => setFilters({ year: 'all', section: 'all', department: '' })}>
                      Clear
                    </Button>
                  </div>
                  
                  {/* Search Box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name, email, or registration number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Bulk Actions */}
                {(selectedVoters.length > 0 || (filters.year !== 'all' || filters.section !== 'all' || filters.department)) && (
                  <div className="flex gap-2 mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      {selectedVoters.length > 0 ? (
                        <span className="text-sm font-medium">{selectedVoters.length} voters selected</span>
                      ) : (
                        <span className="text-sm font-medium">Filtered voters will be affected</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleBulkAction('send-credentials')}
                        disabled={bulkActionLoading}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send Credentials
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('reset-passwords')}
                        disabled={bulkActionLoading}
                      >
                        <Key className="w-4 h-4 mr-1" />
                        Reset Passwords
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" disabled={bulkActionLoading}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBulkAction('mark-voted')}>
                            Mark as Voted
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('mark-not-voted')}>
                            Mark as Not Voted
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleBulkAction('delete')}
                            className="text-red-600"
                          >
                            Delete Selected
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {selectedVoters.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={clearSelection}>
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {viewMode === 'individual' && (
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" variant="outline" onClick={selectAllVoters}>
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearSelection}>
                      <Square className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}

                {viewMode !== 'individual' ? (
                  // Group View with Pagination
                  <div className="space-y-4">
                    {voterGroups.map((group) => {
                      const groupKey = `${group.year}-${group.section || 'ALL'}`
                      const paginationData = getPaginatedVoters(groupKey, group.voters)
                      
                      return (
                        <Card key={groupKey}>
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle className="text-lg">
                                  Year {group.year} {group.section ? `- Section ${group.section}` : '(All Sections)'}
                                </CardTitle>
                                <CardDescription>
                                  {group.department} | {group.totalCount} voters | {group.votedCount} voted
                                  {group.sections && ` | Sections: ${group.sections.join(', ')}`}
                                  {searchTerm && paginationData.totalFiltered !== paginationData.totalOriginal && (
                                    <span className="text-blue-600"> | {paginationData.totalFiltered} matching search</span>
                                  )}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline">
                                  {Math.round((group.votedCount / group.totalCount) * 100)}% voted
                                </Badge>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <UserX className="w-4 h-4 mr-2" />
                                      Delete Group
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Voter Group</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete all {group.totalCount} voters from Year {group.year} 
                                        {group.section ? ` Section ${group.section}` : ''}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deleteGroup(`${group.year}${group.section ? `-${group.section}` : ''}`)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete {group.totalCount} Voters
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">
                                      <Checkbox
                                        checked={paginationData.voters.every(v => selectedVoters.includes(v._id))}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedVoters(prev => [...new Set([...prev, ...paginationData.voters.map(v => v._id)])])
                                          } else {
                                            setSelectedVoters(prev => prev.filter(id => !paginationData.voters.some(v => v._id === id)))
                                          }
                                        }}
                                      />
                                    </TableHead>
                                    <TableHead>Reg No</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginationData.voters.map((voter) => (
                                    <TableRow key={voter._id}>
                                      <TableCell>
                                        <Checkbox
                                          checked={selectedVoters.includes(voter._id)}
                                          onCheckedChange={() => toggleVoterSelection(voter._id)}
                                        />
                                      </TableCell>
                                      <TableCell className="font-mono text-sm">{voter.regNo}</TableCell>
                                      <TableCell>{voter.name}</TableCell>
                                      <TableCell>{voter.email}</TableCell>
                                      <TableCell>
                                        <Badge variant={voter.hasVoted ? "default" : "secondary"}>
                                          {voter.hasVoted ? "Voted" : "Not Voted"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedVoters([voter._id])
                                              handleBulkAction('send-credentials')
                                            }}
                                          >
                                            <Mail className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              
                              {/* Pagination Controls */}
                              {paginationData.totalPages > 1 && (
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-600">
                                    Showing {paginationData.currentPage * VOTERS_PER_PAGE + 1} to{' '}
                                    {Math.min((paginationData.currentPage + 1) * VOTERS_PER_PAGE, paginationData.totalFiltered)} of{' '}
                                    {paginationData.totalFiltered} voters
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => changePage(groupKey, paginationData.currentPage - 1)}
                                      disabled={paginationData.currentPage === 0}
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                      Previous
                                    </Button>
                                    <span className="flex items-center px-3 text-sm">
                                      Page {paginationData.currentPage + 1} of {paginationData.totalPages}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => changePage(groupKey, paginationData.currentPage + 1)}
                                      disabled={paginationData.currentPage >= paginationData.totalPages - 1}
                                    >
                                      Next
                                      <ChevronRight className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  // Individual View with Search
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={filterVoters(voters).length > 0 && filterVoters(voters).every(v => selectedVoters.includes(v._id))}
                              onCheckedChange={(checked) => {
                                const filteredVoters = filterVoters(voters)
                                if (checked) {
                                  setSelectedVoters(prev => [...new Set([...prev, ...filteredVoters.map(v => v._id)])])
                                } else {
                                  setSelectedVoters(prev => prev.filter(id => !filteredVoters.some(v => v._id === id)))
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Reg No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterVoters(voters).map((voter) => (
                          <TableRow key={voter._id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedVoters.includes(voter._id)}
                                onCheckedChange={() => toggleVoterSelection(voter._id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{voter.regNo}</TableCell>
                            <TableCell>{voter.name}</TableCell>
                            <TableCell>{voter.email}</TableCell>
                            <TableCell>{voter.year}</TableCell>
                            <TableCell>{voter.section}</TableCell>
                            <TableCell>{voter.department}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {showPasswords[voter._id] ? voter.password : '••••••••'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowPasswords({
                                    ...showPasswords,
                                    [voter._id]: !showPasswords[voter._id]
                                  })}
                                >
                                  {showPasswords[voter._id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={voter.hasVoted ? "default" : "secondary"}>
                                {voter.hasVoted ? "Voted" : "Not Voted"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedVoters([voter._id])
                                    handleBulkAction('send-credentials')
                                  }}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {searchTerm && filterVoters(voters).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No voters found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-poll" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Poll</CardTitle>
                <CardDescription>Set up a new election poll</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="poll-title">Poll Title</Label>
                  <Input
                    id="poll-title"
                    value={newPoll.title}
                    onChange={(e) => setNewPoll({...newPoll, title: e.target.value})}
                    placeholder="Enter poll title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="poll-description">Description</Label>
                  <Textarea
                    id="poll-description"
                    value={newPoll.description}
                    onChange={(e) => setNewPoll({...newPoll, description: e.target.value})}
                    placeholder="Enter poll description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-year">Target Year</Label>
                    <Select value={newPoll.targetYear} onValueChange={(value) => setNewPoll({...newPoll, targetYear: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-section">Target Section</Label>
                    <Select value={newPoll.targetSection} onValueChange={(value) => setNewPoll({...newPoll, targetSection: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Sections (Entire Year)</SelectItem>
                        <SelectItem value="A">Section A</SelectItem>
                        <SelectItem value="B">Section B</SelectItem>
                        <SelectItem value="C">Section C</SelectItem>
                        <SelectItem value="D">Section D</SelectItem>
                        <SelectItem value="E">Section E</SelectItem>
                        <SelectItem value="F">Section F</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-department">Target Department</Label>
                    <Select value={newPoll.targetDepartment} onValueChange={(value) => setNewPoll({...newPoll, targetDepartment: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="ADS">ADS</SelectItem>
                        <SelectItem value="ALL">All Departments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Candidates</Label>
                  {newPoll.candidates.map((candidate, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={candidate}
                        onChange={(e) => {
                          const updated = [...newPoll.candidates]
                          updated[index] = e.target.value
                          setNewPoll({...newPoll, candidates: updated})
                        }}
                        placeholder={`Candidate ${index + 1}`}
                      />
                      {newPoll.candidates.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = newPoll.candidates.filter((_, i) => i !== index)
                            setNewPoll({...newPoll, candidates: updated})
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setNewPoll({...newPoll, candidates: [...newPoll.candidates, '']})}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Candidate
                  </Button>
                </div>

                <Button onClick={createPoll} className="w-full">
                  Create Poll
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="polls" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Polls</CardTitle>
                <CardDescription>View, edit, and manage election polls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {polls.map((poll) => (
                    <Card key={poll._id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{poll.title}</CardTitle>
                            <CardDescription>{poll.description}</CardDescription>
                            <p className="text-sm text-gray-600 mt-2">
                              Target: Year {poll.targetYear} {poll.targetSection === 'ALL' ? '(All Sections)' : `Section ${poll.targetSection}`}
                              {poll.targetDepartment && poll.targetDepartment !== 'ALL' ? `, Department ${poll.targetDepartment}` : poll.targetDepartment === 'ALL' ? ', All Departments' : ''}
                              <br />
                              Eligible Voters: {poll.eligibleVotersCount} | Votes Cast: {poll.votes?.length || 0}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={poll.isActive ? "default" : "secondary"}>
                              {poll.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPoll(poll)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={poll.isActive ? "destructive" : "default"}
                              size="sm"
                              onClick={() => togglePoll(poll._id, poll.isActive)}
                            >
                              {poll.isActive ? "Close Poll" : "Open Poll"}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Poll</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{poll.title}"? This will also delete all {poll.votes?.length || 0} votes associated with this poll. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deletePoll(poll._id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Poll
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <h4 className="font-medium mb-2">Candidates:</h4>
                          <div className="flex flex-wrap gap-2">
                            {poll.candidates.map((candidate, index) => (
                              <Badge key={index} variant="outline">{candidate}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Election Results</CardTitle>
                <CardDescription>View voting statistics and results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{voters.length || voterGroups.reduce((sum, group) => sum + group.totalCount, 0)}</div>
                      <p className="text-sm text-gray-600">Total Voters</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{voters.filter(v => v.hasVoted).length || voterGroups.reduce((sum, group) => sum + group.votedCount, 0)}</div>
                      <p className="text-sm text-gray-600">Votes Cast</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{voters.filter(v => !v.hasVoted).length || voterGroups.reduce((sum, group) => sum + (group.totalCount - group.votedCount), 0)}</div>
                      <p className="text-sm text-gray-600">Pending Votes</p>
                    </CardContent>
                  </Card>
                </div>

                {polls.map((poll) => (
                  <Card key={poll._id} className="mb-4">
                    <CardHeader>
                      <CardTitle>{poll.title}</CardTitle>
                      <CardDescription>
                        Target: Year {poll.targetYear} {poll.targetSection === 'ALL' ? '(All Sections)' : `Section ${poll.targetSection}`} | 
                        Eligible: {poll.eligibleVotersCount} | Voted: {poll.votes?.length || 0}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {poll.candidates.map((candidate, index) => {
                          const votes = poll.votes?.filter(v => v.candidate === candidate).length || 0
                          const percentage = poll.votes?.length > 0 ? (votes / poll.votes.length * 100).toFixed(1) : 0
                          return (
                            <div key={index} className="flex justify-between items-center">
                              <span>{candidate}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">{votes} ({percentage}%)</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Poll Dialog */}
        <Dialog open={!!editingPoll} onOpenChange={() => setEditingPoll(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Poll</DialogTitle>
              <DialogDescription>
                Make changes to the poll details
              </DialogDescription>
            </DialogHeader>
            {editingPoll && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Poll Title</Label>
                  <Input
                    value={editingPoll.title}
                    onChange={(e) => setEditingPoll({...editingPoll, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingPoll.description}
                    onChange={(e) => setEditingPoll({...editingPoll, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Year</Label>
                    <Select value={editingPoll.targetYear} onValueChange={(value) => setEditingPoll({...editingPoll, targetYear: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Target Section</Label>
                    <Select value={editingPoll.targetSection} onValueChange={(value) => setEditingPoll({...editingPoll, targetSection: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Sections (Entire Year)</SelectItem>
                        <SelectItem value="A">Section A</SelectItem>
                        <SelectItem value="B">Section B</SelectItem>
                        <SelectItem value="C">Section C</SelectItem>
                        <SelectItem value="D">Section D</SelectItem>
                        <SelectItem value="E">Section E</SelectItem>
                        <SelectItem value="F">Section F</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Candidates</Label>
                  {editingPoll.candidates.map((candidate, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={candidate}
                        onChange={(e) => {
                          const updated = [...editingPoll.candidates]
                          updated[index] = e.target.value
                          setEditingPoll({...editingPoll, candidates: updated})
                        }}
                        placeholder={`Candidate ${index + 1}`}
                      />
                      {editingPoll.candidates.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = editingPoll.candidates.filter((_, i) => i !== index)
                            setEditingPoll({...editingPoll, candidates: updated})
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setEditingPoll({...editingPoll, candidates: [...editingPoll.candidates, '']})}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Candidate
                  </Button>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingPoll(null)}>
                    Cancel
                  </Button>
                  <Button onClick={updatePoll}>
                    Update Poll
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
