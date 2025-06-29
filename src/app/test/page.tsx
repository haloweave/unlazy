import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function TestPage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Page</h1>
        
        {user ? (
          <div className="space-y-4">
            <p className="text-green-600">✅ You are signed in!</p>
            <p className="text-sm text-gray-600">User: {user.emailAddresses[0]?.emailAddress}</p>
            <Link 
              href="/chat"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Go to Chat
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-red-600">❌ You are not signed in</p>
            <Link 
              href="/"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Go to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 