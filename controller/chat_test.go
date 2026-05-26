package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
)

func TestChatMessagesForCompletion(t *testing.T) {
	storedMessages := []*model.ChatMessage{
		{Role: model.ChatMessageRoleSystem, Content: "  keep answers short  "},
		{Role: "tool", Content: "ignored"},
		{Role: model.ChatMessageRoleAssistant, Content: "  ready  "},
		{Role: model.ChatMessageRoleUser, Content: "   "},
	}

	messages := chatMessagesForCompletion(storedMessages, "hello")
	if len(messages) != 3 {
		t.Fatalf("len(messages) = %d, want 3", len(messages))
	}
	if messages[0].Role != model.ChatMessageRoleSystem || messages[0].Content != "keep answers short" {
		t.Fatalf("first message = %#v", messages[0])
	}
	if messages[1].Role != model.ChatMessageRoleAssistant || messages[1].Content != "ready" {
		t.Fatalf("second message = %#v", messages[1])
	}
	if messages[2].Role != model.ChatMessageRoleUser || messages[2].Content != "hello" {
		t.Fatalf("last message = %#v", messages[2])
	}
}

func TestChatCompletionContentToString(t *testing.T) {
	if got := chatCompletionContentToString("  hello  "); got != "hello" {
		t.Fatalf("string content = %q, want hello", got)
	}
	if got := chatCompletionContentToString(map[string]any{"text": "hello"}); got != `{"text":"hello"}` {
		t.Fatalf("object content = %q", got)
	}
	if got := chatCompletionContentToString(nil); got != "" {
		t.Fatalf("nil content = %q, want empty", got)
	}
}

func TestChatRelayErrorMessage(t *testing.T) {
	body := []byte(`{"error":{"message":"upstream failed"}}`)
	if got := chatRelayErrorMessage(body); got != "upstream failed" {
		t.Fatalf("chatRelayErrorMessage = %q, want upstream failed", got)
	}

	plain := []byte(`plain failure`)
	if got := chatRelayErrorMessage(plain); got != "plain failure" {
		t.Fatalf("plain chatRelayErrorMessage = %q, want plain failure", got)
	}
}
