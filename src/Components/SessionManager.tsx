import { useState } from "react";
import { useJoinUrl } from "react-together";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "./ui/button";
import { Globe } from "lucide-react";

export default function SessionManager() {
  const [isOpen, setIsOpen] = useState(false);
  const joinUrl = useJoinUrl()!;

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    alert("Link copied to clipboard!");
  }

  return (
    <>
      {isOpen && (
        <div className="absolute right-0 bottom-[52px] flex flex-col gap-4 rounded-md bg-neutral-800 p-4">
          <QRCodeSVG className="h-40 w-40" value={joinUrl} />
          <Button onClick={copyLink} variant="secondary">
            Copy Link
          </Button>
        </div>
      )}
      <Globe onClick={() => setIsOpen(!isOpen)} />
    </>
  );
}
