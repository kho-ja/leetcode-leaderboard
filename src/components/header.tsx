import { Code2Icon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import Profile from "./profile";

export default function Header() {
  return (
    <header className="flex sticky top-0 z-50 p-6 border-b-2 justify-between flex-wrap bg-background">
      <div className="flex items-center flex-shrink-0 text-white gap-2">
        <Code2Icon />
        <div>LeetCode Leaderboard.</div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Profile />
      </div>
    </header>
  );
}
