import { useConnectedUsers, useStateTogether } from "react-together";
import { App as multisynq, useSetSession } from "@multisynq/react";
import { Play } from "lucide-react";
import { Button } from "./ui/button";

type Session = {
  userId: string;
  nickname: string;
  name: string;
  password: string;
};

export default function ChoosingSession({
  changeStep,
}: {
  changeStep: () => void;
}) {
  const connectedUsers = useConnectedUsers();
  const user = connectedUsers.find((user) => user.isYou)!;

  const [sessions, setSessions] = useStateTogether("sessions", [] as Session[]);

  const setSession = useSetSession();

  function createSession() {
    const name = multisynq.randomSession();
    const password = multisynq.randomPassword();

    setSessions((sessions) => [
      ...sessions,
      {
        nickname: user.nickname,
        userId: user.userId,
        name: name,
        password: password,
      },
    ]);

    setSession({ name: name, password: password });
    changeStep();
  }

  function joinSession(session: Session) {
    setSession({ name: session.name, password: session.password });
    changeStep();
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex min-h-14 justify-center border-b-1 border-neutral-50">
        <div className="flex w-11/12 items-center justify-between">
          <p className="text-neutral-50">
            Hello {user.nickname} ({user.userId})
          </p>
          <p className="text-neutral-50">
            There are {connectedUsers.length} users connected!
          </p>
        </div>
      </div>
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col gap-4">
          <p className="text-center text-xl font-bold text-neutral-50">
            Choose a session to join:
          </p>
          <div className="flex h-52 w-96 flex-col gap-2 overflow-y-scroll rounded-md bg-neutral-900 p-4">
            {sessions.length !== 0 ? (
              <>
                {sessions.map((session) => (
                  <div className="flex justify-between">
                    <p className="text-neutral-50">
                      {session.nickname}'s ({session.userId}) session
                    </p>
                    <Play className="text-neutral-50" onClick={() => joinSession(session)} />
                  </div>
                ))}
              </>
            ) : (
              <p className="m-auto text-neutral-50">No sessions available</p>
            )}
          </div>
          <Button onClick={createSession} variant="secondary">
            Create session
          </Button>
        </div>
      </div>
    </div>
  );
}
