import { currentUser } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Brain, Sparkles } from "lucide-react";

export default async function HomePage() {
  const user = await currentUser();

  if (user) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Brain className="h-16 w-16 text-indigo-600" />
              <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-2 -right-2" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Unlazy.ai
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Think before you answer. Build your cognitive muscles with AI.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <SignIn 
            redirectUrl="/chat"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0",
                headerTitle: "text-2xl font-bold text-gray-900",
                headerSubtitle: "text-gray-600",
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors",
                formFieldInput: "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg",
                footerActionLink: "text-indigo-600 hover:text-indigo-700",
              }
            }}
          />
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Join thousands of thinkers building better brains</p>
        </div>
      </div>
    </div>
  );
}
