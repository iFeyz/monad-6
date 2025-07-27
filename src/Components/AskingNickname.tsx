import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNicknames } from "react-together";
import z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const formSchema = z.object({
  nickname: z
    .string()
    .min(3, { message: "Nickname must be at least 3 characters long" })
    .max(16, { message: "Nickname must be at most 16 characters long" }),
});

export default function AskingNickname({
  changeStep,
}: {
  changeStep: () => void;
}) {
  const [, setNickname] = useNicknames();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nickname: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setNickname(values.nickname);
    changeStep();
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col gap-4">
        <p className="text-center text-xl font-bold text-neutral-50">
          Who are you ?
        </p>
        <Form {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Nickname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            ></FormField>
            <Button className="w-full" type="submit" variant="secondary">
              Submit
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
