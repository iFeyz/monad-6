import { useState } from "react";
import { useJoinUrl } from "react-together";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "./ui/button";
import { Globe, Share2, Link } from "lucide-react";

export default function SessionManager() {
  const [isOpen, setIsOpen] = useState(false);
  const joinUrl = useJoinUrl();

  // Extract session parameters from React Together
  const getSessionParams = () => {
    // Get session data from React Together context or URL
    const currentUrl = new URL(window.location.href);
    const rtName = currentUrl.searchParams.get('rtName') || 'default-session';
    const rtPwd = currentUrl.hash.includes('rtPwd=') 
      ? new URLSearchParams(currentUrl.hash.substring(1)).get('rtPwd') || 'default-password'
      : 'default-password';
    
    return { rtName, rtPwd };
  };

  // Generate shareable link with session parameters
  const generateShareLink = () => {
    const { rtName, rtPwd } = getSessionParams();
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    return `${baseUrl}?rtName=${encodeURIComponent(rtName)}#rtPwd=${encodeURIComponent(rtPwd)}`;
  };

  const shareLink = generateShareLink();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      alert("Session link copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert("Failed to copy link");
    }
  }

  async function copyJoinUrl() {
    if (joinUrl) {
      try {
        await navigator.clipboard.writeText(joinUrl);
        alert("React Together URL copied to clipboard!");
      } catch (err) {
        console.error('Failed to copy join URL:', err);
        alert("Failed to copy join URL");
      }
    }
  }

  const shareToSocial = () => {
    const text = "Join me in Monad Space!";
    const url = shareLink;
    
    if (navigator.share) {
      navigator.share({
        title: 'Monad Space Session',
        text: text,
        url: url,
      });
    } else {
      // Fallback: copy to clipboard
      copyLink();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="absolute right-0 bottom-[52px] flex flex-col gap-4 rounded-md bg-neutral-800 border border-purple-500 p-4 min-w-[320px] shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-medium">Share Session</h3>
          </div>

          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG 
              className="h-32 w-32" 
              value={shareLink}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* Session Info */}
          <div className="space-y-2">
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Session Name:</p>
              <p className="text-white font-mono text-sm">{getSessionParams().rtName}</p>
            </div>
            
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Share Link:</p>
              <p className="text-white font-mono text-xs break-all">{shareLink}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">

            
            <Button 
              onClick={shareToSocial} 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Session
            </Button>

            {joinUrl && (
              <Button 
                onClick={copyJoinUrl} 
                variant="secondary"
                className="w-full bg-gray-600 hover:bg-gray-500 text-white"
              >
                <Link className="w-4 h-4 mr-2" />
                Copy React Together URL
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-400 text-center">
            Anyone with this link can join your session
          </div>
        </div>
      )}
      
      <div className="relative">
        <Globe 
          onClick={() => setIsOpen(!isOpen)} 
          className="cursor-pointer text-neutral-50 hover:text-purple-400 transition-colors"
        />
        {isOpen && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-sky-600 animate-pulse"></div>
        )}
      </div>
    </>
  );
}