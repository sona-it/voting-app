'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Vote, CheckCircle, Clock } from 'lucide-react'

interface Poll {
  _id: string
  title: string
  description: string
  candidates: string[]
  isActive: boolean
  hasVoted: boolean
  targetYear?: string
  targetSection?: string
  targetbranch?: string
}

export default function VoterDashboard() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<{[key: string]: string}>({})
  const [voterInfo, setVoterInfo] = useState<any>(null)

  useEffect(() => {
    fetchVoterInfo()
    fetchPolls()
  }, [])

  const fetchVoterInfo = async () => {
    try {
      const response = await fetch('/api/voter/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) setVoterInfo(data.voter)
    } catch (error) {
      console.error('Failed to fetch voter info:', error)
    }
  }

  const fetchPolls = async () => {
    try {
      const response = await fetch('/api/voter/polls', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) setPolls(data.polls)
    } catch (error) {
      console.error('Failed to fetch polls:', error)
    }
  }

  const submitVote = async (pollId: string) => {
    const candidate = selectedCandidates[pollId]
    if (!candidate) {
      alert('Please select a candidate')
      return
    }

    try {
      const response = await fetch('/api/voter/vote', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pollId, candidate })
      })
      const data = await response.json()
      if (data.success) {
        alert('Vote submitted successfully!')
        fetchPolls()
      } else {
        alert(data.message || 'Failed to submit vote')
      }
    } catch (error) {
      alert('Failed to submit vote')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userType')
    window.location.href = '/'
  }

  // Filter polls for voter's branch, year, and section
  let filteredPolls = polls;
  if (voterInfo) {
    filteredPolls = polls.filter(poll => {
      const yearMatch = poll.targetYear === voterInfo.year;
      const sectionMatch = !poll.targetSection || poll.targetSection === 'ALL' || poll.targetSection === voterInfo.section;
      const branchMatch = !poll.targetbranch || poll.targetbranch === 'ALL' || poll.targetbranch === voterInfo.branch;
      return yearMatch && sectionMatch && branchMatch;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voter Dashboard</h1>
            {voterInfo && (
              <p className="text-gray-600">
                Welcome, {voterInfo.name} ({voterInfo.year} Year, Section {voterInfo.section})
              </p>
            )}
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>

        <div className="space-y-6">
          {filteredPolls.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Polls Available</h3>
                <p className="text-gray-600">There are currently no active polls for your year, section, and branch.</p>
              </CardContent>
            </Card>
          ) : (
            filteredPolls.map((poll) => (
              <Card key={poll._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {poll.title}
                        {poll.hasVoted && <CheckCircle className="w-5 h-5 text-green-600" />}
                      </CardTitle>
                      <CardDescription>{poll.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={poll.isActive ? "default" : "secondary"}>
                        {poll.isActive ? "Active" : "Closed"}
                      </Badge>
                      {poll.hasVoted && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Voted
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {poll.hasVoted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Vote Submitted</h3>
                      <p className="text-gray-600">Thank you for participating in this poll.</p>
                    </div>
                  ) : !poll.isActive ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Poll Closed</h3>
                      <p className="text-gray-600">This poll is currently not accepting votes.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium">Select your candidate:</h4>
                      <RadioGroup
                        value={selectedCandidates[poll._id] || ''}
                        onValueChange={(value) => setSelectedCandidates({
                          ...selectedCandidates,
                          [poll._id]: value
                        })}
                      >
                        {poll.candidates.map((candidate, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={candidate} id={`${poll._id}-${index}`} />
                            <Label htmlFor={`${poll._id}-${index}`} className="cursor-pointer">
                              {candidate}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <Button 
                        onClick={() => submitVote(poll._id)}
                        className="w-full"
                        disabled={!selectedCandidates[poll._id]}
                      >
                        <Vote className="w-4 h-4 mr-2" />
                        Submit Vote
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
