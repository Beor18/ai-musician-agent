import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "./CodeBlock";

interface ChatMessageProps {
  message: string;
  isLast: boolean;
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.startsWith("You:");
  const content = isUser ? message : message.replace("Agent: ", "");

  const renderContent = () => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <p key={lastIndex} className="whitespace-pre-wrap">
            {content.slice(lastIndex, match.index)}
          </p>
        );
      }
      const language = match[1] || "typescript";
      parts.push(
        <CodeBlock
          key={match.index}
          code={match[2].trim()}
          language={language}
        />
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <p key={lastIndex} className="whitespace-pre-wrap">
          {content.slice(lastIndex)}
        </p>
      );
    }

    return parts;
  };

  return (
    <>
      <div
        className={`rounded-lg p-3 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? (
          <p className="font-semibold">{content}</p>
        ) : (
          <>
            <p className="font-semibold mb-1">Agent:</p>
            {renderContent()}
          </>
        )}
      </div>
      {!isLast && <Separator className="my-2" />}
    </>
  );
}
