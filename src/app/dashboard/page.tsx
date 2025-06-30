import { redirect } from "next/navigation";

export default function DashboardPage() {
  // Redirect to homepage since that's our main interface
  redirect("/");
} 