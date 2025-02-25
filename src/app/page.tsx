"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Calendar, Medal, Loader2, Target, Trophy, Code, LineChart, Flame, AlertCircle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

type UserData = {
  id: string
  name: string
  avatar: string
  totalSolved: number
  problemsByDifficulty: {
    easy: number
    medium: number
    hard: number
  }
  submissions: number
  acceptedSubmissions: number[] // Timestamps of accepted submissions
  streak?: {
    current: number
    max: number
  }
}

type ErrorData = {
  username: string
  error: string
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("all")
  const [userData, setUserData] = useState<UserData[]>([])
  const [filteredData, setFilteredData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchErrors, setFetchErrors] = useState<ErrorData[]>([])
  const [showErrors, setShowErrors] = useState(true)
  const [isFromCache, setIsFromCache] = useState(false)
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/leetcode")
        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }
        const data = await response.json()
        setUserData(data.users)
        setFilteredData(data.users)
        setIsFromCache(data.fromCache || false)
        setCacheTimestamp(data.timestamp || null)
        
        // Store any errors that occurred during API fetching
        if (data.errors && data.errors.length > 0) {
          console.warn("Some users could not be fetched:", data.errors)
          setFetchErrors(data.errors)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const filterDataByTimeRange = () => {
      const now = Date.now()
      const msInDay = 86400000 // milliseconds in a day

      const getFilteredSubmissions = (timestamps: number[], daysAgo: number) => {
        const cutoff = now - daysAgo * msInDay
        return timestamps.filter((timestamp) => timestamp * 1000 >= cutoff).length
      }

      const filtered = userData
        .map((user) => {
          let relevantSubmissions = 0

          switch (timeRange) {
            case "week":
              relevantSubmissions = getFilteredSubmissions(user.acceptedSubmissions, 7)
              break
            case "month":
              relevantSubmissions = getFilteredSubmissions(user.acceptedSubmissions, 30)
              break
            case "year":
              relevantSubmissions = getFilteredSubmissions(user.acceptedSubmissions, 365)
              break
            default:
              relevantSubmissions = user.totalSolved
          }

          return {
            ...user,
            totalSolved: relevantSubmissions,
          }
        })
        .sort((a, b) => b.totalSolved - a.totalSolved)

      setFilteredData(filtered)
    }

    filterDataByTimeRange()
  }, [timeRange, userData])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Fetching LeetCode data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  const calculateDifficultyScore = (user: UserData) => {
    return (
      user.problemsByDifficulty.easy * 1 + user.problemsByDifficulty.medium * 2 + user.problemsByDifficulty.hard * 3
    )
  }

  const openLeetcodeProfile = (userId: string) => {
    window.open(`https://leetcode.com/${userId}`, '_blank');
  };

  // Get top 3 users for podium
  const topUsers = filteredData.slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {showErrors && fetchErrors.length > 0 && (
          <Alert variant="destructive" className="relative">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to fetch some users</AlertTitle>
            <AlertDescription>
              <div>
                <p>The following users could not be fetched from LeetCode:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {fetchErrors.map((err) => (
                    <Badge key={err.username} variant="outline" className="bg-destructive/10">
                      {err.username}: {err.error}
                    </Badge>
                  ))}
                </div>
              </div>
            </AlertDescription>
            <button 
              className="absolute right-2 top-2 rounded-full p-1 hover:bg-destructive/20"
              onClick={() => setShowErrors(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">LeetCode Champions</h1>
            {isFromCache && cacheTimestamp && (
              <p className="text-xs text-muted-foreground">
                Using cached data from {new Date(cacheTimestamp).toLocaleString()}
              </p>
            )}
          </div>
          <Select defaultValue={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Podium Section */}
        {topUsers.length >= 3 && (
          <div className="flex justify-center gap-4 py-8">
            {/* Second Place */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <Image
                  src={topUsers[1].avatar || "/placeholder.svg?height=80&width=80"}
                  width={80}
                  height={80}
                  alt={topUsers[1].name}
                  className="h-20 w-20 cursor-pointer rounded-full border-4 border-silver"
                  onClick={() => openLeetcodeProfile(topUsers[1].id)}
                />
                <Medal className="absolute -bottom-2 -right-2 h-8 w-8 text-[#C0C0C0]" />
              </div>
              <div className="h-32 w-24 rounded-t-lg bg-[#C0C0C0]" />
              <p className="mt-2 cursor-pointer font-semibold hover:underline" onClick={() => openLeetcodeProfile(topUsers[1].id)}>
                {topUsers[1].name}
              </p>
              <p className="text-sm text-muted-foreground">{topUsers[1].totalSolved} solved</p>
            </div>

            {/* First Place */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <Image
                  src={topUsers[0].avatar || "/placeholder.svg?height=96&width=96"}
                  width={96}
                  height={96}
                  alt={topUsers[0].name}
                  className="h-24 w-24 cursor-pointer rounded-full border-4 border-gold"
                  onClick={() => openLeetcodeProfile(topUsers[0].id)}
                />
                <Trophy className="absolute -bottom-2 -right-2 h-8 w-8 text-[#FFD700]" />
              </div>
              <div className="h-40 w-24 rounded-t-lg bg-[#FFD700]" />
              <p className="mt-2 cursor-pointer font-semibold hover:underline" onClick={() => openLeetcodeProfile(topUsers[0].id)}>
                {topUsers[0].name}
              </p>
              <p className="text-sm text-muted-foreground">{topUsers[0].totalSolved} solved</p>
            </div>

            {/* Third Place */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <Image
                  src={topUsers[2].avatar || "/placeholder.svg?height=64&width=64"}
                  width={64}
                  height={64}
                  alt={topUsers[2].name}
                  className="h-16 w-16 cursor-pointer rounded-full border-4 border-bronze"
                  onClick={() => openLeetcodeProfile(topUsers[2].id)}
                />
                <Medal className="absolute -bottom-2 -right-2 h-8 w-8 text-[#CD7F32]" />
              </div>
              <div className="h-24 w-24 rounded-t-lg bg-[#CD7F32]" />
              <p className="mt-2 cursor-pointer font-semibold hover:underline" onClick={() => openLeetcodeProfile(topUsers[2].id)}>
                {topUsers[2].name}
              </p>
              <p className="text-sm text-muted-foreground">{topUsers[2].totalSolved} solved</p>
            </div>
          </div>
        )}

        {/* Stats Categories */}
        <Tabs defaultValue="problems" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="problems">Problems Solved</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="difficulty">By Difficulty</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
          </TabsList>

          <TabsContent value="problems" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {filteredData.map((user, index) => (
                <Card key={user.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {index + 1}.{" "}
                      <span 
                        className="cursor-pointer hover:underline" 
                        onClick={() => openLeetcodeProfile(user.id)}
                      >
                        {user.name}
                      </span>
                    </CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{user.totalSolved}</div>
                    <p className="text-xs text-muted-foreground">problems solved</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="difficulty" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {filteredData.map((user, index) => (
                <Card key={user.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {index + 1}.{" "}
                      <span 
                        className="cursor-pointer hover:underline" 
                        onClick={() => openLeetcodeProfile(user.id)}
                      >
                        {user.name}
                      </span>
                    </CardTitle>
                    <Code className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-500">Easy:</span>
                        <span className="font-medium">{user.problemsByDifficulty.easy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-500">Medium:</span>
                        <span className="font-medium">{user.problemsByDifficulty.medium}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-500">Hard:</span>
                        <span className="font-medium">{user.problemsByDifficulty.hard}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="points" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...filteredData]
                .sort((a, b) => calculateDifficultyScore(b) - calculateDifficultyScore(a))
                .map((user, index) => (
                  <Card key={user.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {index + 1}.{" "}
                        <span 
                          className="cursor-pointer hover:underline" 
                          onClick={() => openLeetcodeProfile(user.id)}
                        >
                          {user.name}
                        </span>
                      </CardTitle>
                      <LineChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{calculateDifficultyScore(user)}</div>
                      <p className="text-xs text-muted-foreground">difficulty points</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...filteredData]
                .sort((a, b) => b.submissions - a.submissions)
                .map((user, index) => (
                  <Card key={user.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {index + 1}.{" "}
                        <span 
                          className="cursor-pointer hover:underline" 
                          onClick={() => openLeetcodeProfile(user.id)}
                        >
                          {user.name}
                        </span>
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{user.submissions}</div>
                      <p className="text-xs text-muted-foreground">total submissions</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="streaks" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...filteredData]
                .sort((a, b) => (b.streak?.max || 0) - (a.streak?.max || 0))
                .map((user, index) => (
                  <Card key={user.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {index + 1}.{" "}
                        <span 
                          className="cursor-pointer hover:underline" 
                          onClick={() => openLeetcodeProfile(user.id)}
                        >
                          {user.name}
                        </span>
                      </CardTitle>
                      <Flame className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Current streak:</span>
                          <span className="font-medium">{user.streak?.current || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Max streak:</span>
                          <span className="text-2xl font-bold">{user.streak?.max || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

