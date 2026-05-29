package common

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCaptureChatBilling(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	capture := &ChatBillingCapture{}
	c.Set(ContextKeyChatBillingCapture, capture)

	CaptureChatBilling(c, &RelayInfo{
		BillingSource:         "subscription",
		SubscriptionId:        7,
		SubscriptionPlanId:    3,
		SubscriptionPlanTitle: "Monthly",
		SubscriptionPostDelta: -20,
		RequestId:             "req-1",
	}, 100, 25, 125, 500)

	if capture.PromptTokens != 100 {
		t.Fatalf("PromptTokens = %d, want 100", capture.PromptTokens)
	}
	if capture.CompletionTokens != 25 {
		t.Fatalf("CompletionTokens = %d, want 25", capture.CompletionTokens)
	}
	if capture.TotalTokens != 125 {
		t.Fatalf("TotalTokens = %d, want 125", capture.TotalTokens)
	}
	if capture.Quota != 500 {
		t.Fatalf("Quota = %d, want 500", capture.Quota)
	}
	if capture.BillingSource != "subscription" {
		t.Fatalf("BillingSource = %q, want subscription", capture.BillingSource)
	}
	if capture.SubscriptionId != 7 {
		t.Fatalf("SubscriptionId = %d, want 7", capture.SubscriptionId)
	}
	if capture.SubscriptionPlanId != 3 {
		t.Fatalf("SubscriptionPlanId = %d, want 3", capture.SubscriptionPlanId)
	}
	if capture.SubscriptionPlanTitle != "Monthly" {
		t.Fatalf("SubscriptionPlanTitle = %q, want Monthly", capture.SubscriptionPlanTitle)
	}
	if capture.SubscriptionPostDelta != -20 {
		t.Fatalf("SubscriptionPostDelta = %d, want -20", capture.SubscriptionPostDelta)
	}
	if capture.RequestId != "req-1" {
		t.Fatalf("RequestId = %q, want req-1", capture.RequestId)
	}
}

func TestCaptureChatBillingDefaultsTotalTokens(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	capture := &ChatBillingCapture{}
	c.Set(ContextKeyChatBillingCapture, capture)

	CaptureChatBilling(c, &RelayInfo{}, 40, 2, 0, 10)

	if capture.TotalTokens != 42 {
		t.Fatalf("TotalTokens = %d, want 42", capture.TotalTokens)
	}
}
