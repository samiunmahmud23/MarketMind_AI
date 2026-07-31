import { BaseChatModel, BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGeneration, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { getZAI } from "../ai/zai";

/**
 * ZaiChatModel — LangChain BaseChatModel wrapper around z-ai-web-dev-sdk.
 *
 * This lets us use LangChain's LCEL chains, prompt templates, and output
 * parsers with the z-ai-web-dev-sdk backend (which is already installed
 * and configured in this project).
 *
 * Usage:
 *   const model = new ZaiChatModel();
 *   const chain = prompt | model | parser;
 *   const result = await chain.invoke({ topic: "AI marketing" });
 */
export interface ZaiChatModelParams extends BaseChatModelParams {
  /** Enable chain-of-thought reasoning (default: false) */
  thinking?: boolean;
  /** Temperature / creativity (passed to z-ai as a hint in the system prompt) */
  temperature?: number;
}

export class ZaiChatModel extends BaseChatModel {
  thinking: boolean;
  temperature: number;

  static lc_name() {
    return "ZaiChatModel";
  }

  get lc_secrets(): { [key: string]: string } {
    return {};
  }

  get lc_aliases(): { [key: string]: string } {
    return {};
  }

  _llmType(): string {
    return "z-ai";
  }

  constructor(params: ZaiChatModelParams = {}) {
    super(params);
    this.thinking = params.thinking ?? false;
    this.temperature = params.temperature ?? 0.7;
  }

  /**
   * Convert LangChain messages to z-ai-web-dev-sdk format.
   * LangChain uses SystemMessage, HumanMessage, AIMessage.
   * z-ai SDK uses { role: "assistant" | "user", content: string }.
   */
  private convertMessages(messages: BaseMessage[]): { role: string; content: string }[] {
    return messages.map((msg) => {
      const content = typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);

      if (msg instanceof SystemMessage || msg._getType() === "system") {
        return { role: "assistant", content };
      }
      if (msg instanceof AIMessage || msg._getType() === "ai") {
        return { role: "assistant", content };
      }
      return { role: "user", content };
    });
  }

  /**
   * Core generation method — calls z-ai-web-dev-sdk's chat.completions.create.
   */
  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const zai = await getZAI();
    const convertedMessages = this.convertMessages(messages);

    const completion = await zai.chat.completions.create({
      messages: convertedMessages as any,
      thinking: { type: this.thinking ? "enabled" : "disabled" },
    } as any);

    const content = completion.choices[0]?.message?.content ?? "";
    const aiMessage = new AIMessage(content);

    // Report tokens used to the callback manager for tracing
    if (runManager && (completion as any).usage) {
      const usage = (completion as any).usage;
      await runManager.handleLLMNewToken(content);
    }

    return {
      generations: [
        {
          text: content,
          message: aiMessage,
        } as ChatGeneration,
      ],
      llmOutput: {
        tokenUsage: (completion as any)?.usage || {},
      },
    };
  }

  /**
   * Stream support — delegates to _generate (z-ai SDK doesn't expose streaming
   * in a LangChain-compatible way yet; this is a non-streaming fallback).
   */
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<any> {
    const result = await this._generate(messages, options, runManager);
    yield {
      text: result.generations[0].text,
      message: result.generations[0].message,
    };
  }
}
