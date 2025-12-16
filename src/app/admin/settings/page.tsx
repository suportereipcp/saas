import { fetchSettings } from "@/actions/settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
    const settings = await fetchSettings();

    return (
        <div className="space-y-2">
            <SettingsForm initialSettings={settings} />
        </div>
    );
}
