"use client";

import { getUserByWallet } from "@/actions/supabase/users";
import { ThirdwebConnectButton } from "@/components/auth/ThirdwebConnectButton";
import { client } from "@/lib/thirdweb";
import { fetchUserFromThirdWeb } from "@/services/thirdweb.service";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";

export default function SignInPage() {
  const account = useActiveAccount();

  const router = useRouter();

  // Once wallet connected, get user data
  const signInUser = async () => {
    console.debug("Account", account);

    const address = account?.address;
    const user = await fetchUserFromThirdWeb(client, address || "");
    const email = user?.email;

    if (!email || !address) return;

    console.debug("Thirdweb auth successful", address, email);

    // Fetch or create user in Supabase
    const userRes = await getUserByWallet(email, address);

    console.debug("User response from Supabase", userRes);

    // router.push("/dashboard");
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
