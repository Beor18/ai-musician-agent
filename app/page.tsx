/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";

export default function Home() {
  const [mode, setMode] = useState<"chat" | "auto">("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    setMessages((prev) => [...prev, `You: ${input}`]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((prev) => [...prev, `Agent: ${chunk}`]);
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setInput("");
      setIsLoading(false);
    }
  };

  const startAutoMode = async () => {
    setIsLoading(true);
    setIsAutoRunning(true);
    setError(null);
    setMessages([]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((prev) => [...prev, chunk]);
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsAutoRunning(false);
    }
  };

  const stopAutoMode = async () => {
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, `System: ${data.message}`]);
    } catch (error: any) {
      console.error("Error stopping auto mode:", error);
      setError(`Error stopping auto mode: ${error.message}`);
    } finally {
      setIsAutoRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Tabs
        value={mode}
        onValueChange={(value: string) => setMode(value as "chat" | "auto")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat Mode</TabsTrigger>
          <TabsTrigger value="auto">Auto Mode</TabsTrigger>
        </TabsList>
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat with Musician Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[800px] w-full rounded-md border">
                <div className="p-4">
                  {messages.map((msg, index) => (
                    <div key={index} className="mb-4">
                      <ChatMessage
                        message={msg}
                        isLast={index === messages.length - 1}
                      />
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-grow"
                />
                <Button type="submit" disabled={isLoading}>
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="auto">
          <Card>
            <CardHeader>
              <CardTitle>Auto Mode</CardTitle>
            </CardHeader>
            <CardContent>
              {!isAutoRunning ? (
                <Button onClick={startAutoMode} disabled={isLoading}>
                  Start Auto Mode
                </Button>
              ) : (
                <Button onClick={stopAutoMode} variant="destructive">
                  Stop Auto Mode
                </Button>
              )}
              <ScrollArea className="h-[400px] w-full rounded-md border mt-4">
                <div className="p-4">
                  {messages.map((msg, index) => (
                    <div key={index} className="mb-4">
                      <ChatMessage
                        message={msg}
                        isLast={index === messages.length - 1}
                      />
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
