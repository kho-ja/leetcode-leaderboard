import { NextResponse } from "next/server"
import { LeetCode, UserProfile } from "leetcode-query"
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const leetcode = new LeetCode()

// Type definitions for LeetCode API responses

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
const CACHE_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

/**
 * Loads cached data if available and not expired
 */
async function loadCache(): Promise<UserData[] | null> {
  try {
    const cachedUsers = await prisma.leetCodeUser.findMany({
      where: {
        lastFetch: {
          gte: new Date(Date.now() - CACHE_EXPIRY_MS)
        }
      }
    })

    if (cachedUsers.length === usernames.length) {
      console.log('Using cached LeetCode data from database')
      return cachedUsers.map(user => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        totalSolved: user.totalSolved,
        problemsByDifficulty: {
          easy: user.easyCount,
          medium: user.mediumCount,
          hard: user.hardCount,
        },
        submissions: user.submissions,
        acceptedSubmissions: user.submissionCalendar ?
          Object.keys(user.submissionCalendar as object).map(k => parseInt(k)) : [],
        streak: {
          current: user.currentStreak,
          max: user.maxStreak
        }
      }))
    }

    console.log('Cache expired or incomplete, fetching fresh data')
    return null
  } catch (error) {
    console.error('Error reading database cache:', error)
    return null
  }
}

/**
 * Saves user data to the database
 */
async function saveUserData(userData: UserData): Promise<void> {
  try {
    // First upsert the user
    await prisma.leetCodeUser.upsert({
      where: { id: userData.id },
      update: {
        name: userData.name,
        avatar: userData.avatar,
        totalSolved: userData.totalSolved,
        easyCount: userData.problemsByDifficulty.easy,
        mediumCount: userData.problemsByDifficulty.medium,
        hardCount: userData.problemsByDifficulty.hard,
        submissions: userData.submissions,
        currentStreak: userData.streak?.current || 0,
        maxStreak: userData.streak?.max || 0,
        submissionCalendar: userData.acceptedSubmissions.reduce((acc, timestamp) => {
          acc[timestamp.toString()] = 1;
          return acc;
        }, {} as Record<string, number>),
        lastFetch: new Date(),
      },
      create: {
        id: userData.id,
        name: userData.name,
        avatar: userData.avatar,
        totalSolved: userData.totalSolved,
        easyCount: userData.problemsByDifficulty.easy,
        mediumCount: userData.problemsByDifficulty.medium,
        hardCount: userData.problemsByDifficulty.hard,
        submissions: userData.submissions,
        currentStreak: userData.streak?.current || 0,
        maxStreak: userData.streak?.max || 0,
        submissionCalendar: userData.acceptedSubmissions.reduce((acc, timestamp) => {
          acc[timestamp.toString()] = 1;
          return acc;
        }, {} as Record<string, number>),
      }
    });

    // Then create submissions records
    const submissions = userData.acceptedSubmissions.map(timestamp => ({
      userId: userData.id,
      timestamp: new Date(timestamp * 1000),
      // We'd need these from the LeetCode API
      difficulty: "Unknown", // Would need actual difficulty
      problemId: "Unknown", // Would need actual problem ID
      accepted: true
    }));

    // Create the submissions
    await prisma.leetCodeSubmission.createMany({
      data: submissions,
      skipDuplicates: true,
    });
  } catch (error) {
    console.error('Failed to save user data:', error);
    await prisma.fetchLog.create({
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

/**
 * Fetches a user's data from the LeetCode GraphQL API
 */
async function fetchLeetCodeUser(username: string): Promise<UserProfile | null> {
  try {
    const user = await leetcode.user(username)
    return user
  } catch (error) {
    console.error(`Failed to fetch user data for ${username}:`, error)
    return null
  }
}

/**
 * Processes the user data from LeetCode API
 */
function processUserData(results: UserProfile[]): { users: UserData[], errors: ErrorData[] } {
  const users: UserData[] = []
  const errors: ErrorData[] = []

  for (let i = 0; i < usernames.length; i++) {
    const result = results[i]
    const username = usernames[i]

    if (!result || !result.matchedUser) {
      errors.push({
        username,
        error: "Failed to fetch user data",
      })
      continue
    }

    const {
      username: leetUsername,
      profile,
      submitStats,
      submissionCalendar
    } = result.matchedUser

    // Extract problem counts by difficulty
    const easy = submitStats?.acSubmissionNum?.find((s) => s.difficulty === "Easy")?.count || 0
    const medium = submitStats?.acSubmissionNum?.find((s) => s.difficulty === "Medium")?.count || 0
    const hard = submitStats?.acSubmissionNum?.find((s) => s.difficulty === "Hard")?.count || 0

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
    const totalSubmissions = submitStats?.acSubmissionNum?.find(
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
      name: profile?.realName || leetUsername,
      avatar: profile?.userAvatar || '',
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
        users: cachedData,
        errors: [],
        fromCache: true,
        timestamp: new Date().toISOString(),
      })
    }

    // Fetch each user sequentially
    const usersResults: UserProfile[] = [];

    for (const username of usernames) {
      const result = await fetchLeetCodeUser(username);
      if (result) {
        usersResults.push(result);
      }
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check if we're getting rate limited
    const rateLimited = usersResults.length === 0 || usersResults.some(result => !result.matchedUser)
    if (rateLimited) {
      console.log("Rate limited by LeetCode API");

      // Try to use older cache if available, even if expired
      const oldCache = await prisma.leetCodeUser.findMany();
      if (oldCache.length > 0) {
        const formattedCache = oldCache.map(user => ({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          totalSolved: user.totalSolved,
          problemsByDifficulty: {
            easy: user.easyCount,
            medium: user.mediumCount,
            hard: user.hardCount,
          },
          submissions: user.submissions,
          acceptedSubmissions: user.submissionCalendar ?
            Object.keys(user.submissionCalendar as object).map(k => parseInt(k)) : [],
          streak: {
            current: user.currentStreak,
            max: user.maxStreak
          }
        }));

        return NextResponse.json({
          users: formattedCache,
          errors: [],
          fromCache: true,
          rateLimited: true,
          timestamp: new Date().toISOString(),
        });
      }

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

    // Save each user to the database
    await Promise.all(users.map(user => saveUserData(user)))

    // Log successful fetch
    await prisma.fetchLog.create({
      data: {
        success: true
      }
    })

    return NextResponse.json({
      users,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Unhandled error in GET handler:", error)

    await prisma.fetchLog.create({
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json({
      users: [],
      errors: [{
        username: "ALL",
        error: "An unexpected error occurred: " + (error instanceof Error ? error.message : String(error))
      }],
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

