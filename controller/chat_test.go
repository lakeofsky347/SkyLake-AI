package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
)

func TestChatMessagesForCompletion(t *testing.T) {
	storedMessages := []*model.ChatMessage{
		{Role: model.ChatMessageRoleSystem, Content: "  keep answers short  "},
		{Role: "tool", Content: "ignored"},
		{Role: model.ChatMessageRoleAssistant, Content: "  ready  "},
		{Role: model.ChatMessageRoleUser, Content: "   "},
	}

	messages := chatMessagesForCompletion(storedMessages, "hello", nil)
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

func TestChatMessagesForCompletionWithStoredParts(t *testing.T) {
	_, _, partsJSON, err := normalizeChatMessageContent("describe this", []chatMessageContentPartRequest{
		{
			Type: dto.ContentTypeText,
			Text: "describe this",
		},
		{
			Type: dto.ContentTypeImageURL,
			ImageURL: &chatMessageImageURLPartRequest{
				URL: "https://example.com/image.png",
			},
		},
	})
	if err != nil {
		t.Fatalf("normalizeChatMessageContent error = %v", err)
	}

	messages := chatMessagesForCompletion([]*model.ChatMessage{
		{Role: model.ChatMessageRoleUser, Content: "describe this", ContentParts: partsJSON},
	}, "next", nil)
	if len(messages) != 2 {
		t.Fatalf("len(messages) = %d, want 2", len(messages))
	}
	parts, ok := messages[0].Content.([]dto.MediaContent)
	if !ok {
		t.Fatalf("stored content type = %T, want []dto.MediaContent", messages[0].Content)
	}
	if len(parts) != 2 || parts[0].Type != dto.ContentTypeText || parts[1].Type != dto.ContentTypeImageURL {
		t.Fatalf("stored content parts = %#v", parts)
	}
}

func TestNormalizeChatMessageContentWithImageURL(t *testing.T) {
	summary, parts, partsJSON, err := normalizeChatMessageContent("  describe this  ", []chatMessageContentPartRequest{
		{
			Type: dto.ContentTypeImageURL,
			ImageURL: &chatMessageImageURLPartRequest{
				URL:    "https://example.com/image.png",
				Detail: "high",
			},
		},
	})
	if err != nil {
		t.Fatalf("normalizeChatMessageContent error = %v", err)
	}
	if summary != "describe this" {
		t.Fatalf("summary = %q, want describe this", summary)
	}
	if len(parts) != 2 {
		t.Fatalf("len(parts) = %d, want 2", len(parts))
	}
	if partsJSON == "" {
		t.Fatal("partsJSON is empty")
	}
}

func TestNormalizeChatMessageContentRejectsInvalidImageURL(t *testing.T) {
	_, _, _, err := normalizeChatMessageContent("", []chatMessageContentPartRequest{
		{
			Type: dto.ContentTypeImageURL,
			ImageURL: &chatMessageImageURLPartRequest{
				URL: "file:///tmp/image.png",
			},
		},
	})
	if err == nil {
		t.Fatal("normalizeChatMessageContent error = nil, want error")
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

func TestParseChatStreamCapture(t *testing.T) {
	streamBody := []byte("" +
		"data: {\"model\":\"test-model\",\"choices\":[{\"delta\":{\"content\":\"hel\"}}]}\n\n" +
		"data: {\"choices\":[{\"delta\":{\"content\":\"lo\"}}],\"usage\":{\"prompt_tokens\":3,\"completion_tokens\":2,\"total_tokens\":5}}\n\n" +
		"data: [DONE]\n\n")

	result := parseChatStreamCapture(streamBody)
	if result.Content != "hello" {
		t.Fatalf("stream content = %q, want hello", result.Content)
	}
	if !result.Done {
		t.Fatal("stream done = false, want true")
	}
	if result.Model != "test-model" {
		t.Fatalf("stream model = %q, want test-model", result.Model)
	}
	if result.Usage.PromptTokens != 3 || result.Usage.CompletionTokens != 2 || result.Usage.TotalTokens != 5 {
		t.Fatalf("stream usage = %#v", result.Usage)
	}
}

func TestParseChatStreamCaptureWithoutDone(t *testing.T) {
	streamBody := []byte("" +
		"data: {\"model\":\"test-model\",\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n")

	result := parseChatStreamCapture(streamBody)
	if result.Content != "partial" {
		t.Fatalf("stream content = %q, want partial", result.Content)
	}
	if result.Done {
		t.Fatal("stream done = true, want false")
	}
}
