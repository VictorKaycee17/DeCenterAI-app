import { refreshUnrealSessionToken } from "@/services/unrealAuth.service";
import { toast } from "react-toastify";
import { Account } from "thirdweb/wallets";

interface TokenInvalidMessageProps {
  account: Account | undefined;
  chainId: number | undefined;
  onRefreshSuccess?: () => void; // Callback to notify parent on successful refresh
}

export default function TokenInvalidMessage({
  account,
  chainId,
  onRefreshSuccess,
}: TokenInvalidMessageProps) {
  async function refreshSessionToken() {
    if (!account || !chainId) {
      toast.error("Wallet not connected");
      return { success: false };
    }

    try {
      const refreshRes = await refreshUnrealSessionToken(account, chainId);

      if (refreshRes.success) {
        toast.success("Session token refreshed successfully");
      }

      if (onRefreshSuccess) onRefreshSuccess(); // Trigger callback on success

      return { success: true };
    } catch (error) {
      console.error("Error refresh session token", error);
      toast.error(
        error instanceof Error ? error.message : "Refresh session token failed"
      );
      return { success: false };
    }
  }
  return (
    <div className="w-full p-4 bg-red-600 text-white text-center rounded-[20px] mb-4">
      You do not have a valid Unreal API session token. Please{" "}
      <span
        onClick={refreshSessionToken}
        className="font-semibold underline cursor-pointer"
      >
        refresh session token
      </span>{" "}
      or contact us.
    </div>
  );
}
