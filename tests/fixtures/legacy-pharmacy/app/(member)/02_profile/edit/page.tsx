"use client";

import { useAuth } from "@/context/AuthContext";
import EditProfileContent from "@/components/member/profile/EditProfileContent";

export default function EditProfilePage() {
    const { userName, userId } = useAuth();

    const displayUserName = userName || "ภก. สมชาย รักชาติ";
    const displayUserId = userId || "ภ.12345";

    return (
        <EditProfileContent userName={displayUserName} userId={displayUserId} />
    );
}
