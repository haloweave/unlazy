import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Brain, Clock, MessageSquare, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function BrainPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  // Mock data - in real app, this would come from Supabase
  const metrics = {
    brainFoodCount: 42,
    totalQuestions: 15,
    totalThinkingTime: 3600, // in seconds
    topics: ["JavaScript", "React", "AI", "Philosophy", "Science"],
    weeklyProgress: [
      { day: "Mon", count: 3 },
      { day: "Tue", count: 5 },
      { day: "Wed", count: 2 },
      { day: "Thu", count: 7 },
      { day: "Fri", count: 4 },
      { day: "Sat", count: 6 },
      { day: "Sun", count: 3 },
    ]
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/chat"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Brain Analytics</h1>
              <p className="text-sm text-gray-500">Your cognitive journey</p>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Brain Food Count */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Brain className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Brain Food</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.brainFoodCount}</p>
              </div>
            </div>
            <div className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12 this week
            </div>
          </div>

          {/* Total Questions */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Questions Asked</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalQuestions}</p>
              </div>
            </div>
            <div className="text-xs text-blue-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +3 this week
            </div>
          </div>

          {/* Thinking Time */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Thinking Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(metrics.totalThinkingTime)}</p>
              </div>
            </div>
            <div className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +45m this week
            </div>
          </div>

          {/* Average Response Time */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">4.2m</p>
              </div>
            </div>
            <div className="text-xs text-purple-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              -0.8m this week
            </div>
          </div>
        </div>

        {/* Weekly Progress Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Progress</h2>
          <div className="flex items-end justify-between h-32">
            {metrics.weeklyProgress.map((day) => (
              <div key={day.day} className="flex flex-col items-center space-y-2">
                <div 
                  className="bg-indigo-600 rounded-t-lg transition-all duration-300 hover:bg-indigo-700"
                  style={{ 
                    height: `${(day.count / 7) * 100}%`,
                    minHeight: '20px',
                    width: '40px'
                  }}
                />
                <span className="text-xs text-gray-600">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Topics</h2>
          <div className="flex flex-wrap gap-3">
            {metrics.topics.map((topic) => (
              <span
                key={topic}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 