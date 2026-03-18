import { redirect } from "next/navigation";

// Alias: redirect platform guide requests to settings guides tab
export default function PlatformsPage() {
  redirect("/admin/settings");
}
