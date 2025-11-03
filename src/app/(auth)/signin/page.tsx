"use client";

import { getOrCreateUser } from "@/actions/supabase/users";
import { ThirdwebConnectButton } from "@/components/auth/ThirdwebConnectButton";
import { useUser } from "@/hooks/useUser";
import { client } from "@/lib/thirdweb";
import { fetchUserFromThirdWeb } from "@/services/thirdweb.service";
import { sendWelcomeTokens } from "@/services/unrealToken.service";
import { UNREAL_REG_PAYLOAD_CONFIG } from "@/utils/config";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useActiveAccount } from "thirdweb/react";

export default function SignInPage() {
  const account = useActiveAccount();

  const router = useRouter();
  const { setUser } = useUser();

  // Once wallet connected, get user data
  const signInUser = async () => {
    const address = account?.address;
    if (!address) {
      console.error("No address / account found");
      return;
    }

    try {
      // Fetch user identity from Thirdweb
      const user = await fetchUserFromThirdWeb(client, address || "");
      const email = user?.email;

      if (!email) {
        console.error("Unable to retrieve email");
        return;
      }

      console.log("Thirdweb auth successful");

      // Fetch or create user in Supabase
      const userRes = await getOrCreateUser(email, address);

      // Send welcome Unreal Token to new user
      if (userRes.isNewUser) {
        const welcomeTokensRes = await sendWelcomeTokens(
          address,
          UNREAL_REG_PAYLOAD_CONFIG.CALLS_INITIAL
        );

        if (!welcomeTokensRes.success) {
          toast.warning("Welcome credits airdrop failed.");
        }

        console.debug("Sending Welcome Token Results", welcomeTokensRes);
      }

      // Store in Zustand
      setUser(userRes.data.id, email, address);

      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, email }),
      });

      // Redirect
      toast.success("Signed in successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Unexpected error during sign-in:", error);
      toast.error("Something went wrong during sign-in");
    }
  };

  useEffect(() => {
    if (account) {
      signInUser();
    }
  }, [account]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      {/* <div className="absolute top-6 left-6">
        <img src="/logo.svg" alt="Decenter AI" className="h-6" />
      </div> */}

      <div className="flex flex-col items-center justify-center rounded-2xl bg-neutral-900/80 p-8 shadow-lg border border-neutral-800 max-w-md w-full">
        <div className="m-4">
          <img src="/logo_top.svg" alt="Login" className="h-full" />
        </div>
        <ThirdwebConnectButton />
      </div>
    </main>
  );
}
