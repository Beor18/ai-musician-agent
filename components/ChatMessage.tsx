import { Separator } from "@/components/ui/separator";

interface ChatMessageProps {
  message: string;
  isLast: boolean;
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.startsWith("You:");

  return (
    <>
      <div
        className={`rounded-lg p-3 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? (
          <p className="font-semibold">{message}</p>
        ) : (
          <>
            <p className="font-semibold mb-1">Agent:</p>
            <p className="whitespace-pre-wrap">
              {message.replace("Agent: ", "")}
            </p>
          </>
        )}
      </div>
      {!isLast && <Separator className="my-2" />}
    </>
  );
}
