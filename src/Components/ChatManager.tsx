import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAllNicknames, useChat, useConnectedUsers } from "react-together";
import z from "zod";
import { Form, FormControl, FormField, FormItem } from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MessageCircle } from "lucide-react";

const formSchema = z.object({
  message: z.string().nonempty().nonoptional(),
});

export default function ChatManager() {
  const { messages, sendMessage } = useChat("test0");
  const connectedUsers = useConnectedUsers();
  const allNicknames = useAllNicknames();
  const [isOpen, setIsOpen] = useState(false);

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
    return allNicknames[senderId];
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    sendMessage(values.message);
    form.reset({ message: "" });
  }

  return (
    <>
      {isOpen && (
        <div className="absolute right-0 flex flex-col gap-2 bottom-[52px] w-xs bg-neutral-800 p-2 rounded">
          <div
            className="flex flex-col overflow-y-scroll gap-2 h-96"
            style={{ scrollbarWidth: "none" }}
          >
            {messages.map((message) => (
              <div
                className={cn(
                  "px-2 py-1 rounded",
                  isMe(message.senderId) ? "bg-sky-600" : "bg-neutral-400"
                )}
              >
                [{formatTime(message.sentAt)}] {getNickname(message.senderId)} (
                {message.senderId}) {message.message}
              </div>
            ))}
          </div>
          <Form {...form}>
            <form className="flex gap-2" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input placeholder="Message" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit">Send</Button>
            </form>
          </Form>
        </div>
      )}
      <MessageCircle onClick={() => setIsOpen(!isOpen)} />
    </>
  );
}
