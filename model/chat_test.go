package model

import (
	"strings"
	"testing"
)

func TestNormalizeChatTitle(t *testing.T) {
	if got := NormalizeChatTitle("  hello chat  "); got != "hello chat" {
		t.Fatalf("NormalizeChatTitle trimmed value = %q", got)
	}
	if got := NormalizeChatTitle(""); got != "New chat" {
		t.Fatalf("NormalizeChatTitle empty value = %q", got)
	}

	longTitle := strings.Repeat("a", 140)
	if got := NormalizeChatTitle(longTitle); len([]rune(got)) != 128 {
		t.Fatalf("NormalizeChatTitle long value length = %d", len([]rune(got)))
	}
}

func TestIsValidChatMessageRole(t *testing.T) {
	validRoles := []string{
		ChatMessageRoleSystem,
		ChatMessageRoleUser,
		ChatMessageRoleAssistant,
	}
	for _, role := range validRoles {
		if !IsValidChatMessageRole(role) {
			t.Fatalf("role %q should be valid", role)
		}
	}
	if IsValidChatMessageRole("tool") {
		t.Fatal("role tool should be invalid")
	}
}
