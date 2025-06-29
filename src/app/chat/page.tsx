import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import BrainFoodCounter from "@/components/BrainFoodCounter";
import { UserButton } from "@clerk/nextjs";

export default async function ChatPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">Unlazy.ai</h1>
            <span className="text-sm text-gray-500">Think smarter</span>
          </div>
          <div className="flex items-center space-x-4">
            <BrainFoodCounter />
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8",
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Chat Interface */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ChatInterface />
      </main>
    </div>
  );
} 