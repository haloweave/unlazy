import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, User, Mail, Calendar, Brain } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/chat"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="text-sm text-gray-500">Your account settings</p>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-12 w-12 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-gray-600">Cognitive Explorer</p>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900">{user.emailAddresses[0]?.emailAddress}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Member since</p>
                    <p className="text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <Brain className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-indigo-600">42</p>
                  <p className="text-sm text-gray-600">Brain Food</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="h-8 w-8 bg-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">Q</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">15</p>
                  <p className="text-sm text-gray-600">Questions</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="h-8 w-8 bg-green-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">T</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">1h</p>
                  <p className="text-sm text-gray-600">Thinking Time</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/brain"
                  className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Brain className="h-5 w-5 text-indigo-600" />
                    <span className="text-gray-900 font-medium">View Brain Analytics</span>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
                </Link>
                
                <button className="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 bg-red-600 rounded-full" />
                    <span className="text-red-700 font-medium">Sign Out</span>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-red-400 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 