"""Reusable Groq chat client with streaming tool-use loop.

Ported from agentic-recon's _chat_service_groq.py. This is a generic
implementation — supply your own system prompt, tools, and tool executor.

Usage:
    from app.services.groq_client import chat_stream

    async for event in chat_stream(
        messages=conversation_history,
        system_prompt="You are a fraud analyst...",
        tools=MY_TOOLS,
        tool_executor=my_executor_fn,
    ):
        # event: {"type": "text_delta", "content": "..."} |
        #        {"type": "tool_call", ...} |
        #        {"type": "tool_result", ...} |
        #        {"type": "done"}
        pass
"""

import json
import logging
from collections.abc import AsyncGenerator, Callable, Awaitable
from typing import Any

from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)

# Type for tool executor: (tool_name, input_dict) -> result_dict
ToolExecutor = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]


def get_client() -> AsyncGroq:
    """Create an AsyncGroq client from settings."""
    return AsyncGroq(api_key=settings.groq_api_key)


async def chat_stream(
    messages: list[dict],
    system_prompt: str,
    tools: list[dict] | None = None,
    tool_executor: ToolExecutor | None = None,
    model: str | None = None,
    max_iterations: int = 10,
    max_tokens: int = 4096,
) -> AsyncGenerator[dict, None]:
    """Run the Groq tool-use loop and yield SSE events.

    Yields dicts with type: text_delta | tool_call | tool_result | done.
    Compatible with EventSourceResponse streaming.
    """
    client = get_client()
    model = model or settings.groq_chat_model

    # Build message list: system first, then conversation history
    api_messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant"):
            api_messages.append({"role": role, "content": content})

    create_kwargs: dict[str, Any] = {
        "model": model,
        "messages": api_messages,
        "max_tokens": max_tokens,
        "stream": True,
    }
    if tools:
        create_kwargs["tools"] = tools
        create_kwargs["tool_choice"] = "auto"

    for _ in range(max_iterations):
        collected_text = ""
        tool_calls_acc: dict[int, dict] = {}

        stream = await client.chat.completions.create(**create_kwargs)

        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta is None:
                continue

            # Stream text content
            if delta.content:
                collected_text += delta.content
                yield {"type": "text_delta", "content": delta.content}

            # Accumulate tool call fragments across chunks
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc.id:
                        tool_calls_acc[idx]["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            tool_calls_acc[idx]["name"] = tc.function.name
                        if tc.function.arguments:
                            tool_calls_acc[idx]["arguments"] += tc.function.arguments

        # No tool calls — we're done
        if not tool_calls_acc:
            break

        # If no executor provided, we can't run tools
        if tool_executor is None:
            logger.warning("Model requested tool calls but no executor provided")
            break

        # Build assistant message with tool_calls (OpenAI format)
        tool_calls_list = []
        for idx in sorted(tool_calls_acc):
            tc = tool_calls_acc[idx]
            tool_calls_list.append({
                "id": tc["id"],
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": tc["arguments"],
                },
            })

        assistant_msg: dict = {
            "role": "assistant",
            "content": collected_text or None,
            "tool_calls": tool_calls_list,
        }
        api_messages.append(assistant_msg)

        # Execute each tool and append results
        for tc in tool_calls_list:
            name = tc["function"]["name"]
            raw_args = tc["function"]["arguments"]
            try:
                input_data = json.loads(raw_args) if raw_args.strip() else {}
            except json.JSONDecodeError:
                logger.warning("Malformed tool args for %s: %r", name, raw_args)
                yield {
                    "type": "tool_result",
                    "id": tc["id"],
                    "name": name,
                    "content": {"error": f"Malformed arguments for '{name}' — please retry."},
                }
                api_messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps({"error": f"Malformed arguments for {name}."}),
                })
                continue

            yield {
                "type": "tool_call",
                "id": tc["id"],
                "name": name,
                "input": input_data,
            }

            try:
                result = await tool_executor(name, input_data)
            except Exception as e:
                logger.exception("Tool execution error for %s", name)
                result = {"error": str(e)}

            result_str = json.dumps(result, default=str)

            yield {
                "type": "tool_result",
                "id": tc["id"],
                "name": name,
                "content": result,
            }

            api_messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result_str,
            })

        # Update create_kwargs with new messages for next iteration
        create_kwargs["messages"] = api_messages

    yield {"type": "done"}


async def chat_simple(
    prompt: str,
    system_prompt: str = "You are a helpful assistant.",
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.1,
    response_format: dict | None = None,
) -> str:
    """Simple non-streaming completion. Useful for structured extraction tasks."""
    client = get_client()
    model = model or settings.groq_model

    create_kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        create_kwargs["response_format"] = response_format

    response = await client.chat.completions.create(**create_kwargs)
    return response.choices[0].message.content or ""
