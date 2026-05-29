package common

import "github.com/gin-gonic/gin"

const ContextKeyChatBillingCapture = "chat_billing_capture"

type ChatBillingCapture struct {
	PromptTokens          int
	CompletionTokens      int
	TotalTokens           int
	Quota                 int
	BillingSource         string
	SubscriptionId        int
	SubscriptionPlanId    int
	SubscriptionPlanTitle string
	SubscriptionPostDelta int64
	RequestId             string
}

func CaptureChatBilling(c *gin.Context, relayInfo *RelayInfo, promptTokens int, completionTokens int, totalTokens int, quota int) {
	if c == nil || relayInfo == nil {
		return
	}
	value, exists := c.Get(ContextKeyChatBillingCapture)
	if !exists {
		return
	}
	capture, ok := value.(*ChatBillingCapture)
	if !ok || capture == nil {
		return
	}
	if totalTokens <= 0 {
		totalTokens = promptTokens + completionTokens
	}
	capture.PromptTokens = promptTokens
	capture.CompletionTokens = completionTokens
	capture.TotalTokens = totalTokens
	capture.Quota = quota
	capture.BillingSource = relayInfo.BillingSource
	capture.SubscriptionId = relayInfo.SubscriptionId
	capture.SubscriptionPlanId = relayInfo.SubscriptionPlanId
	capture.SubscriptionPlanTitle = relayInfo.SubscriptionPlanTitle
	capture.SubscriptionPostDelta = relayInfo.SubscriptionPostDelta
	capture.RequestId = relayInfo.RequestId
}
