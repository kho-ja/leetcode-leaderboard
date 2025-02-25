import { NextResponse } from "next/server"
import { createClient } from 'redis';

const redis = await createClient({ url: process.env.REDIS_URL }).connect();;

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
  "Ibroximov_Diyorbek",
  "Daydi",
]

// Cache configuration
const LEETCODE_CACHE_KEY = 'leetcode-data'
const CACHE_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const REQUEST_DELAY_MS = 500 // 500ms delay between requests to avoid rate limiting
const MAX_RETRIES = 2 // Maximum number of retries for failed requests

/**
 * Sleep for the given number of milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Loads cached data if available and not expired
 */
async function loadCache(): Promise<CacheData | null> {
  try {
    // Try to read from Vercel REDIS
    const cacheData = JSON.parse(await redis.get(LEETCODE_CACHE_KEY) as string) as {
      timestamp: number;
      data: CacheData;
    } | null;
    
    if (!cacheData) {
      console.log('No cache found in REDIS')
      return null
    }
    
    const { timestamp, data } = cacheData
    
    // Check if cache is expired
    if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
      console.log('Using cached LeetCode data from REDIS')
      return data
    }

    console.log('Cache expired, fetching fresh data')
    return null
  } catch (error) {
    console.log('Error reading REDIS cache:', error)
    return null
  }
}

/**
 * Saves data to the cache
 */
async function saveCache(data: CacheData): Promise<void> {
  try {
    const cacheContent = {
      timestamp: Date.now(),
      data
    }

    await redis.set(LEETCODE_CACHE_KEY, JSON.stringify(cacheContent))
    console.log('LeetCode data cached successfully in REDIS')
  } catch (error) {
    console.error('Failed to cache LeetCode data in REDIS:', error)
  }
}

/**
 * Fetches a user's data from the LeetCode GraphQL API with retries
 */
async function fetchLeetCodeUser(username: string): Promise<ApiResult> {
  // Updated query to remove the streak field that's causing errors
  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
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

  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      // Add delay before request to avoid rate limiting
      await sleep(REQUEST_DELAY_MS * (retries + 1))

      console.log(`Fetching data for ${username} (attempt ${retries + 1})`)
      
      const response = await fetch("https://leetcode.com/graphql", { // Removed trailing slash
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
        cache: 'no-store' // Prevent caching by the fetch API
      })

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(e);
        console.error(`Failed to parse JSON response for ${username}:`, responseText.substring(0, 100));
        throw new Error("Invalid JSON response from LeetCode API");
      }

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`Rate limited for ${username}`);
          return {
            error: "Rate limited by LeetCode API",
            status: 429
          }
        }
        
        if (response.status === 400) {
          console.error(`Bad request for ${username}:`, data);
          return {
            error: `Bad request: ${data?.errors?.[0]?.message || 'Unknown error'}`,
            status: 400
          }
        }

        return {
          error: `HTTP error! status: ${response.status}`,
          status: response.status,
        }
      }

      // Check for GraphQL errors
      if (data.errors) {
        const errorMessage = data.errors[0]?.message || 'Unknown GraphQL error';
        console.error(`GraphQL error for ${username}:`, errorMessage);
        return {
          error: `GraphQL error: ${errorMessage}`,
          status: 200, // GraphQL returns 200 even with errors
        }
      }

      // Check if the user exists
      if (!data.data?.matchedUser) {
        return {
          error: `User '${username}' not found`,
          status: 404,
        }
      }

      return data.data
    } catch (error) {
      console.error(`Error fetching ${username} (attempt ${retries + 1}):`, error);
      retries++;
      
      if (retries > MAX_RETRIES) {
        return {
          error: error instanceof Error ? error.message : "Unknown error occurred",
          status: 500,
        }
      }
      // Will retry on next loop iteration
    }
  }
  
  // This should never be reached due to the return in the catch block
  return {
    error: "Maximum retries exceeded",
    status: 500,
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

    // Calculate streak from submission calendar instead of profile.streak
    let streak;
    if (acceptedSubmissions.length > 0) {
      try {
        // Sort dates in ascending order
        const sortedSubmissions = [...acceptedSubmissions].sort((a, b) => a - b);
        
        // Calculate date ranges to find streaks
        let currentStreak = 0;
        let maxStreak = 0;
        let lastDate = 0;
        
        // Check if there's a submission within the last 24 hours (for current streak)
        const now = Date.now() / 1000; // Convert to seconds
        const oneDayAgo = now - (24 * 60 * 60); // 24 hours ago in seconds
        const hasSubmissionToday = sortedSubmissions.some(
          date => date >= oneDayAgo && date <= now
        );
        
        if (hasSubmissionToday) {
          currentStreak = 1;
          
          // Count backwards from yesterday to find the current streak
          let checkDate = oneDayAgo - (24 * 60 * 60); // Start from 2 days ago
          let streakDays = 0;
          
          while (true) {
            // Get start and end of the day we're checking
            const dayStart = checkDate;
            const dayEnd = checkDate + (24 * 60 * 60);
            
            // Check if any submission falls in this day
            const hasSubmission = sortedSubmissions.some(
              date => date >= dayStart && date < dayEnd
            );
            
            if (hasSubmission) {
              streakDays++;
              checkDate = checkDate - (24 * 60 * 60); // Move to previous day
            } else {
              break; // Streak ends
            }
          }
          
          currentStreak += streakDays;
          maxStreak = Math.max(currentStreak, maxStreak);
        }
        
        // Also calculate max streak from historical data
        for (const date of sortedSubmissions) {
          if (lastDate === 0 || date - lastDate <= (24 * 60 * 60 * 2)) { // Allow up to 48h gap (1 missed day)
            if (lastDate === 0 || date - lastDate >= (12 * 60 * 60)) { // If at least 12h apart (different days)
              currentStreak++;
            }
          } else {
            maxStreak = Math.max(maxStreak, currentStreak);
            currentStreak = 1;
          }
          lastDate = date;
        }
        
        maxStreak = Math.max(maxStreak, currentStreak);
        
        streak = {
          current: currentStreak,
          max: maxStreak
        };
      } catch (e) {
        console.error(`Failed to calculate streak for ${username}:`, e);
        streak = { current: 0, max: 0 };
      }
    } else {
      streak = { current: 0, max: 0 };
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
  try {
    // Try to load data from cache first
    const cachedData = await loadCache()

    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        fromCache: true
      })
    }

    // Fetch each user sequentially to avoid overwhelming the API
    const usersResults: ApiResult[] = [];
    
    for (const username of usernames) {
      const result = await fetchLeetCodeUser(username);
      usersResults.push(result);
      
      // If we hit a rate limit, break early
      if (result.status === 429) {
        break;
      }
    }

    // Check if we're getting rate limited
    const rateLimited = usersResults.some(result => result.status === 429)
    if (rateLimited) {
      console.log("Rate limited by LeetCode API");
      
      // Try to use older cache if available, even if expired
      try {
        const oldCache = await redis.get(LEETCODE_CACHE_KEY) as {
          timestamp: number;
          data: CacheData;
        } | null;
        
        if (oldCache && oldCache.data && oldCache.data.users && oldCache.data.users.length > 0) {
          console.log("Serving expired cache due to rate limiting");
          return NextResponse.json({
            ...oldCache.data,
            fromCache: true,
            rateLimited: true,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("No old cache available:", e);
      }
      
      // If no old cache, return error
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
  } catch (error) {
    console.error("Unhandled error in GET handler:", error);
    
    return NextResponse.json({
      users: [],
      errors: [{
        username: "ALL",
        error: "An unexpected error occurred: " + (error instanceof Error ? error.message : String(error))
      }],
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

