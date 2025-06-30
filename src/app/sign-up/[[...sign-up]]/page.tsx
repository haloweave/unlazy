import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <SignUp 
          redirectUrl="/"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-xl border-0",
              headerTitle: "text-2xl font-bold text-gray-900",
              headerSubtitle: "text-gray-600",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors",
              formFieldInput: "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg",
              footerActionLink: "text-indigo-600 hover:text-indigo-700",
            }
          }}
        />
      </div>
    </div>
  );
} 