import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Zap, Plus, Play, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background overflow-y-auto">
      <div className="container mx-auto py-8 px-4 h-full">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {session.user.name}!
            </h1>
            <p className="text-muted-foreground">
              Manage your flashcard decks and track your study progress.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Decks</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Create your first deck to get started
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cards Studied Today</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Start studying to track your progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0 days</div>
                <p className="text-xs text-muted-foreground">
                  Build a consistent study habit
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with creating decks and studying
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild className="flex items-center gap-2">
                  <Link href="/dashboard/decks">
                    <Plus className="h-4 w-4" />
                    Create New Deck
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex items-center gap-2">
                  <Link href="/dashboard/ai-flashcards">
                    <Sparkles className="h-4 w-4" />
                    Generate with AI
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex items-center gap-2">
                  <Link href="/dashboard/review">
                    <Play className="h-4 w-4" />
                    Start Studying
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest study sessions and deck updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-4">
                <BookOpen className="h-12 w-12 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Create your first deck to see activity here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
