import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

// Type definitions for LeetCode API responses
interface LeetCodeSubmission {
  difficulty: string;
  count: number;
  submissions: number;
}

interface LeetCodeStreak {
  currentStreak: number;
  maxStreak: number;
}

interface LeetCodeProfile {
  realName: string;
  userAvatar: string;
  ranking?: number;
  reputation?: number;
  starRating?: number;
  aboutMe?: string;
  skillTags?: string[];
  postViewCount?: number;
  postViewCountDiff?: number;
  company?: string;
  school?: string;
  websites?: string[];
  countryName?: string;
  streak?: LeetCodeStreak;
}

interface LeetCodeUser {
  username: string;
  profile: LeetCodeProfile;
  submitStats: {
    acSubmissionNum: LeetCodeSubmission[];
  };
  submissionCalendar: string;
}

// Removed unused interface LeetCodeApiResponse

interface ApiResult {
  error?: string;
  status?: number;
  matchedUser?: LeetCodeUser;
}

// Define proper types for cache data
interface UserData {
  id: string;
  name: string;
  avatar: string;
  totalSolved: number;
  problemsByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  submissions: number;
  acceptedSubmissions: number[];
  streak?: {
    current: number;
    max: number;
  };
}

interface ErrorData {
  username: string;
  error: string;
}

interface CacheData {
  users: UserData[];
  errors: ErrorData[];
  timestamp: string;
}

// Array of LeetCode usernames to fetch
const usernames = [
  "Kho_ja",
  "jdu211171",
  "Ismoilova1031",
  "edSJVRbEh6",
  "pardayevotabek30gmailcom",
  "ayunusov238",
  "Fazliddin_001",
  "Amrullayev",
  "abdufattohcoder2004",
  "MrPyDeveloper",
  "javohir07",
  "otajonovmuhammadali",
  "agadev",
  "muza_Sano",
  "yamamoto05",
  // This username is causing issues
  // "Ibroximov_Diyorbek",
  "Daydi",
]

// Cache configuration
const CACHE_FILE_PATH = path.join(process.cwd(), 'cache', 'leetcode-data.json')
const CACHE_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const REQUEST_DELAY_MS = 500 // 500ms delay between requests to avoid rate limiting

/**
 * Sleep for the given number of milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Loads cached data if available and not expired
 */
async function loadCache(): Promise<CacheData | null> {
  try {
    // Ensure cache directory exists
    await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true })

    // Try to read the cache file
    const cacheData = await fs.readFile(CACHE_FILE_PATH, 'utf8')
    const { timestamp, data } = JSON.parse(cacheData)

    // Check if cache is expired
    if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
      console.log('Using cached LeetCode data')
      return data
    }

    console.log('Cache expired, fetching fresh data')
    return null
  } catch {
    // Removed unused variable
    console.log('No cache found or error reading cache')
    return null
  }
}

/**
 * Saves data to the cache
 */
async function saveCache(data: CacheData): Promise<void> {
  try {
    const cacheContent = JSON.stringify({
      timestamp: Date.now(),
      data
    })

    await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true })
    await fs.writeFile(CACHE_FILE_PATH, cacheContent)
    console.log('LeetCode data cached successfully')
  } catch (error) {
    console.error('Failed to cache LeetCode data:', error)
  }
}

/**
 * Fetches a user's data from the LeetCode GraphQL API
 */
async function fetchLeetCodeUser(username: string): Promise<ApiResult> {
  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
          reputation
          starRating
          aboutMe
          skillTags
          postViewCount
          postViewCountDiff
          company
          school
          websites
          countryName
          streak
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        submissionCalendar
      }
    }
  `

  const variables = {
    username,
  }

  try {
    // Add delay before request to avoid rate limiting
    await sleep(REQUEST_DELAY_MS)

    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return {
          error: "Rate limited by LeetCode API",
          status: 429
        }
      }

      return {
        error: `HTTP error! status: ${response.status}`,
        status: response.status,
      }
    }

    const data = await response.json()

    // Check if the user exists
    if (!data.data.matchedUser) {
      return {
        error: `User '${username}' not found`,
        status: 404,
      }
    }

    return data.data
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      status: 500,
    }
  }
}

/**
 * Processes the user data from LeetCode API
 */
function processUserData(results: ApiResult[]): { users: UserData[], errors: ErrorData[] } {
  const users: UserData[] = []
  const errors: ErrorData[] = []

  for (let i = 0; i < usernames.length; i++) {
    const result = results[i]
    const username = usernames[i]

    // Check if we got an error
    if (result.error) {
      errors.push({
        username,
        error: result.error,
      })
      continue
    }

    // If no error, process the user data
    const { matchedUser } = result as { matchedUser: LeetCodeUser }
    const {
      username: leetUsername,
      profile,
      submitStats,
      submissionCalendar
    } = matchedUser

    // Extract problem counts by difficulty
    const easy = submitStats.acSubmissionNum.find((s) => s.difficulty === "Easy")?.count || 0
    const medium = submitStats.acSubmissionNum.find((s) => s.difficulty === "Medium")?.count || 0
    const hard = submitStats.acSubmissionNum.find((s) => s.difficulty === "Hard")?.count || 0

    // Extract submission timestamps (if available)
    let acceptedSubmissions: number[] = []
    if (submissionCalendar) {
      try {
        const calendar = JSON.parse(submissionCalendar)
        acceptedSubmissions = Object.keys(calendar).map((timestamp) => parseInt(timestamp))
      } catch (e) {
        console.error(`Failed to parse submission calendar for ${username}:`, e)
      }
    }

    // Get total submissions count
    const totalSubmissions = submitStats.acSubmissionNum.find(
      (s) => s.difficulty === "All"
    )?.submissions || 0

    // Get streak information
    let streak = {
      current: 0,
      max: 0
    }

    if (profile.streak) {
      streak = {
        current: profile.streak.currentStreak || 0,
        max: profile.streak.maxStreak || 0
      }
    }

    users.push({
      id: leetUsername,
      name: profile.realName || leetUsername,
      avatar: profile.userAvatar,
      totalSolved: easy + medium + hard,
      problemsByDifficulty: {
        easy,
        medium,
        hard,
      },
      submissions: totalSubmissions,
      acceptedSubmissions,
      streak
    })
  }

  return { users, errors }
}

/**
 * GET handler for the API route
 */
export async function GET() {
  // Try to load data from cache first
  const cachedData = await loadCache()

  if (cachedData) {
    return NextResponse.json({
      ...cachedData,
      fromCache: true
    })
  }

  // If no valid cache, fetch from LeetCode API
  const usersPromises = usernames.map(fetchLeetCodeUser)
  const usersResults = await Promise.all(usersPromises)

  // Check if we're getting rate limited
  const rateLimited = usersResults.some(result => result.status === 429)
  if (rateLimited) {
    // Use mock data or previous cached data if available
    return NextResponse.json({
      users: [],
      errors: [{
        username: "ALL",
        error: "The LeetCode API is currently rate limiting requests. Please try again later."
      }],
      rateLimited: true,
      timestamp: new Date().toISOString(),
    }, { status: 429 })
  }

  // Process user results
  const { users, errors } = processUserData(usersResults)

  // Cache the results for future requests
  const responseData: CacheData = {
    users,
    errors,
    timestamp: new Date().toISOString(),
  }

  // Only cache if we got some successful results
  if (users.length > 0) {
    await saveCache(responseData)
  }

  return NextResponse.json(responseData)
}

