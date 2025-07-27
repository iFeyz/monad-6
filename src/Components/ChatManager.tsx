import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAllNicknames, useChat, useConnectedUsers } from "react-together";
import z from "zod";
import { Form, FormControl, FormField, FormItem } from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MessageCircle, Send, X, Users, Clock } from "lucide-react";

const formSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

export default function ChatManager() {
  const { messages, sendMessage } = useChat("test0");
  const connectedUsers = useConnectedUsers();
  const allNicknames = useAllNicknames();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenMessageCount = useRef(0);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
    
    // Update unread count when chat is closed
    if (!isOpen && messages.length > lastSeenMessageCount.current) {
      setUnreadCount(messages.length - lastSeenMessageCount.current);
    }
  }, [messages]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      lastSeenMessageCount.current = messages.length;
    }
  }, [isOpen]);

  function isMe(senderId: string): boolean {
    const user = connectedUsers.find((user) => senderId === user.userId);
    return user ? user.isYou : false;
  }

  function formatTime(sentAt: number): string {
    return new Date(sentAt).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getNickname(senderId: string): string {
    return allNicknames[senderId] || "Anonymous";
  }

  function getAvatarColor(senderId: string): string {
    const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-red-500'];
    return colors[senderId.length % colors.length];
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.message.trim()) {
      sendMessage(values.message.trim());
      form.reset();
    }
  }

  return (
    <>
      {isOpen && (
        <div className="absolute right-0 bottom-[52px] w-80 bg-black border border-purple-500 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900/90 border-b border-purple-500/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-medium">Chat</h3>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  <span>{connectedUsers.length}</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="h-80 overflow-y-auto bg-gray-900/50 p-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No messages yet</p>
                <p className="text-gray-500 text-xs">Start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => {
                  const nickname = getNickname(message.senderId);
                  const isMyMessage = isMe(message.senderId);
                  
                  return (
                    <div
                      key={`${message.senderId}-${message.sentAt}-${index}`}
                      className={cn(
                        "flex gap-2",
                        isMyMessage ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {/* Avatar */}
                      {!isMyMessage && (
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                          getAvatarColor(message.senderId)
                        )}>
                          {nickname.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Message Content */}
                      <div className={cn(
                        "max-w-[70%] space-y-1",
                        isMyMessage ? "items-end" : "items-start"
                      )}>
                        {/* Username and Time */}
                        <div className={cn(
                          "flex items-center gap-2 text-xs",
                          isMyMessage ? "flex-row-reverse text-right" : "flex-row"
                        )}>
                          <span className={cn(
                            "font-medium",
                            isMyMessage ? "text-purple-300" : "text-gray-300"
                          )}>
                            {isMyMessage ? "You" : nickname}
                          </span>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(message.sentAt)}</span>
                          </div>
                        </div>

                        {/* Message Bubble */}
                        <div className={cn(
                          "px-3 py-2 rounded-lg text-sm break-words",
                          isMyMessage 
                            ? "bg-purple-500 text-white rounded-br-sm" 
                            : "bg-gray-700 text-gray-100 rounded-bl-sm"
                        )}>
                          {message.message}
                        </div>
                      </div>

                      {/* My Avatar */}
                      {isMyMessage && (
                        <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(allNicknames[message.senderId] || "Y").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="bg-gray-900/90 border-t border-purple-500/30 p-3">
            <Form {...form}>
              <form 
                className="flex gap-2" 
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="Type a message..." 
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                          {...field} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              form.handleSubmit(onSubmit)();
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit"
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3"
                  disabled={!form.watch("message")?.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}
      
      {/* Chat Toggle Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "text-neutral-50 hover:text-purple-400 transition-colors cursor-pointer",
            isOpen && "text-purple-400"
          )}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        
        {/* Unread Badge */}
        {unreadCount > 0 && !isOpen && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>
    </>
  );
}