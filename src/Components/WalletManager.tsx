import { AppKitProvider } from "@/reown";
import { useAppKit } from "@reown/appkit/react";
import { Wallet } from "lucide-react";


export default function WalletManager() {
  const { open, close } = useAppKit();
  return (
    <>
      <AppKitProvider>
        <Wallet onClick={() => open()} />
      </AppKitProvider>
    </>
  );
}
