import { redirect } from "next/navigation";

export default function DashboardPage() {
  // Redirect to chat since that's our main interface
  redirect("/chat");
} 