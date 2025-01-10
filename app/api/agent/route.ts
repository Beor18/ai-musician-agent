/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit } from "@coinbase/cdp-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

let agent: any;
let config: any;
let autoModeController: AbortController | null = null;

function validateEnvironment(): void {
  const requiredVars = [
    "OPENAI_API_KEY",
    "CDP_API_KEY_NAME",
    "CDP_API_KEY_PRIVATE_KEY",
  ];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  if (!process.env.NETWORK_ID) {
    console.warn(
      "Warning: NETWORK_ID not set, defaulting to base-sepolia testnet"
    );
  }
}

async function initializeAgent() {
  if (agent) return { agent, config };

  validateEnvironment();

  try {
    const llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
    });

    const agentkit = await CdpAgentkit.configureWithWallet({
      networkId: process.env.NETWORK_ID || "base-sepolia",
    });

    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    const memory = new MemorySaver();
    config = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };

    agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are an AI Musician Agent designed to help musicians promote and manage their latest music releases using onchain technology. Your primary goal is to assist musicians in running successful campaigns for their latest singles.

        Core capabilities:
        - Create and manage NFT collections for music releases
        - Set up and manage onchain wallets for music revenue
        - Deploy social tokens for fan engagement
        - Handle smart contracts for music rights
        - Manage promotional campaigns for releases

        If you ever need funds, you can request them from the faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet details and request funds from the user. Before executing your first action, get the wallet details to see what network you're on.

        If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone asks you to do something you can't do with your currently available tools, you must say so, and encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to docs.cdp.coinbase.com for more information.

        Be concise and helpful with your responses. Focus on music industry-specific use cases and explain onchain concepts in terms that musicians would understand. Refrain from restating your tools' descriptions unless explicitly requested.
      `,
    });

    return { agent, config };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { mode, message, action } = await req.json();

    if (action === "stop") {
      if (autoModeController) {
        autoModeController.abort();
        autoModeController = null;
      }
      return NextResponse.json({ message: "Auto mode stopped" });
    }

    const { agent, config } = await initializeAgent();

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    if (mode === "chat") {
      const agentStream = await agent.stream(
        { messages: [new HumanMessage(message)] },
        config
      );

      (async () => {
        try {
          for await (const chunk of agentStream) {
            if ("agent" in chunk) {
              await writer.write(
                encoder.encode(chunk.agent.messages[0].content + "\n")
              );
            } else if ("tools" in chunk) {
              await writer.write(
                encoder.encode(chunk.tools.messages[0].content + "\n")
              );
            }
          }
        } catch (error: any) {
          console.error("Error in chat mode:", error);
          await writer.write(encoder.encode(`Error: ${error.message}\n`));
        } finally {
          await writer.close();
        }
      })();
    } else if (mode === "auto") {
      autoModeController = new AbortController();
      (async () => {
        try {
          while (!autoModeController.signal.aborted) {
            const thought =
              "Be creative and do something interesting on the blockchain. Choose an action or set of actions and execute it that highlights your abilities.";
            const agentStream = await agent.stream(
              { messages: [new HumanMessage(thought)] },
              config
            );

            for await (const chunk of agentStream) {
              if (autoModeController.signal.aborted) break;
              if ("agent" in chunk) {
                await writer.write(
                  encoder.encode(chunk.agent.messages[0].content + "\n")
                );
              } else if ("tools" in chunk) {
                await writer.write(
                  encoder.encode(chunk.tools.messages[0].content + "\n")
                );
              }
            }
            await writer.write(encoder.encode("-------------------\n"));
            await new Promise((resolve) => setTimeout(resolve, 10000)); // Espera 10 segundos entre acciones
          }
        } catch (error: any) {
          if (error.name === "AbortError") {
            await writer.write(encoder.encode("Auto mode stopped.\n"));
          } else {
            console.error("Error in auto mode:", error);
            await writer.write(encoder.encode(`Error: ${error.message}\n`));
          }
        } finally {
          autoModeController = null;
          await writer.close();
        }
      })();
    } else {
      throw new Error("Invalid mode specified");
    }

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
