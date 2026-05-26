package controller

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	chatDefaultPageSize = 30
	chatMaxPageSize     = 100
	chatMaxMessageChars = 128 * 1024
)

type chatConversationRequest struct {
	Title string `json:"title"`
	Model string `json:"model"`
	Group string `json:"group"`
}

type chatMessageRequest struct {
	Role             string `json:"role"`
	Content          string `json:"content"`
	Model            string `json:"model"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	Quota            int    `json:"quota"`
}

type appendChatMessagesRequest struct {
	Messages []chatMessageRequest `json:"messages"`
}

type sendChatMessageRequest struct {
	Content     string   `json:"content"`
	Model       string   `json:"model"`
	Group       string   `json:"group"`
	MaxTokens   *uint    `json:"max_tokens,omitempty"`
	Temperature *float64 `json:"temperature,omitempty"`
	TopP        *float64 `json:"top_p,omitempty"`
}

type sendChatMessageResponse struct {
	Conversation     *model.ChatConversation `json:"conversation"`
	UserMessage      *model.ChatMessage      `json:"user_message"`
	AssistantMessage *model.ChatMessage      `json:"assistant_message"`
	Usage            chatMessageUsage        `json:"usage"`
}

type chatMessageUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type chatCompletionRelayRequest struct {
	Model       string        `json:"model,omitempty"`
	Group       string        `json:"group,omitempty"`
	Messages    []dto.Message `json:"messages,omitempty"`
	Stream      *bool         `json:"stream,omitempty"`
	MaxTokens   *uint         `json:"max_tokens,omitempty"`
	Temperature *float64      `json:"temperature,omitempty"`
	TopP        *float64      `json:"top_p,omitempty"`
}

type chatRelayErrorResponse struct {
	Message string `json:"message"`
	Error   any    `json:"error"`
}

func parseChatConversationId(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "invalid conversation id")
		return 0, false
	}
	return id, true
}

func parseChatPagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.Query("p"))
	pageSize, _ := strconv.Atoi(c.Query("size"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = chatDefaultPageSize
	}
	if pageSize > chatMaxPageSize {
		pageSize = chatMaxPageSize
	}
	return (page - 1) * pageSize, pageSize
}

func ensureChatConversationOwned(userId int, conversationId int) (*model.ChatConversation, bool, error) {
	conversation, err := model.GetChatConversationById(userId, conversationId)
	if err == nil {
		return conversation, true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, nil
	}
	return nil, false, err
}

func validateChatContent(c *gin.Context, content string) bool {
	if content == "" {
		common.ApiErrorMsg(c, "message content cannot be empty")
		return false
	}
	if len([]rune(content)) > chatMaxMessageChars {
		common.ApiErrorMsg(c, "message content is too long")
		return false
	}
	return true
}

func chatMessagesForCompletion(storedMessages []*model.ChatMessage, userContent string) []dto.Message {
	messages := make([]dto.Message, 0, len(storedMessages)+1)
	for _, message := range storedMessages {
		role := strings.TrimSpace(message.Role)
		content := strings.TrimSpace(message.Content)
		if content == "" || !model.IsValidChatMessageRole(role) {
			continue
		}
		messages = append(messages, dto.Message{
			Role:    role,
			Content: content,
		})
	}
	messages = append(messages, dto.Message{
		Role:    model.ChatMessageRoleUser,
		Content: userContent,
	})
	return messages
}

func chatCompletionContentToString(content any) string {
	switch value := content.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(value)
	default:
		data, err := common.Marshal(value)
		if err != nil {
			return strings.TrimSpace(common.Interface2String(value))
		}
		return strings.TrimSpace(string(data))
	}
}

func chatRelayErrorMessage(body []byte) string {
	var response chatRelayErrorResponse
	if err := common.Unmarshal(body, &response); err == nil {
		if response.Message != "" {
			return response.Message
		}
		switch value := response.Error.(type) {
		case string:
			if strings.TrimSpace(value) != "" {
				return strings.TrimSpace(value)
			}
		case map[string]any:
			if message := common.Interface2String(value["message"]); strings.TrimSpace(message) != "" {
				return strings.TrimSpace(message)
			}
		}
	}
	if message := strings.TrimSpace(string(body)); message != "" {
		return message
	}
	return "chat completion failed"
}

func copyChatRelayContext(source *gin.Context) gin.HandlerFunc {
	return func(target *gin.Context) {
		keys := []constant.ContextKey{
			constant.ContextKeyUserId,
			constant.ContextKeyUserName,
			constant.ContextKeyUserGroup,
			constant.ContextKeyUsingGroup,
			constant.ContextKeyLanguage,
		}
		for _, key := range keys {
			if value, exists := source.Get(string(key)); exists {
				target.Set(string(key), value)
			}
		}
		for _, key := range []string{"role", "use_access_token"} {
			if value, exists := source.Get(key); exists {
				target.Set(key, value)
			}
		}
		target.Next()
	}
}

func callChatCompletionRelay(c *gin.Context, request *chatCompletionRelayRequest) (*dto.OpenAITextResponse, error) {
	requestBody, err := common.Marshal(request)
	if err != nil {
		return nil, err
	}

	relayRequest := httptest.NewRequest(http.MethodPost, "/pg/chat/completions", bytes.NewReader(requestBody))
	relayRequest.Header = c.Request.Header.Clone()
	relayRequest.Header.Set("Content-Type", "application/json")
	relayRequest.Header.Set("Accept", "application/json")
	relayRequest.ContentLength = int64(len(requestBody))

	recorder := httptest.NewRecorder()
	router := gin.New()
	router.Use(middleware.BodyStorageCleanup())
	playgroundRoute := router.Group("/pg")
	playgroundRoute.Use(middleware.RouteTag("relay"))
	playgroundRoute.Use(middleware.SystemPerformanceCheck())
	playgroundRoute.Use(copyChatRelayContext(c), middleware.Distribute())
	playgroundRoute.POST("/chat/completions", Playground)
	router.ServeHTTP(recorder, relayRequest)

	result := recorder.Result()
	defer result.Body.Close()
	responseBody := recorder.Body.Bytes()
	if result.StatusCode < http.StatusOK || result.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("%s", chatRelayErrorMessage(responseBody))
	}

	var completion dto.OpenAITextResponse
	if err := common.Unmarshal(responseBody, &completion); err != nil {
		return nil, err
	}
	if openAIError := completion.GetOpenAIError(); openAIError != nil {
		return nil, fmt.Errorf("%s", openAIError.Message)
	}
	return &completion, nil
}

func ListChatConversations(c *gin.Context) {
	userId := c.GetInt("id")
	startIdx, pageSize := parseChatPagination(c)

	conversations, err := model.ListChatConversations(userId, startIdx, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	total, err := model.CountChatConversations(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items": conversations,
		"total": total,
	})
}

func CreateChatConversation(c *gin.Context) {
	userId := c.GetInt("id")
	var req chatConversationRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "invalid request body")
		return
	}

	conversation, err := model.CreateChatConversation(userId, req.Title, req.Model, req.Group)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, conversation)
}

func UpdateChatConversation(c *gin.Context) {
	userId := c.GetInt("id")
	conversationId, ok := parseChatConversationId(c)
	if !ok {
		return
	}
	if _, owned, err := ensureChatConversationOwned(userId, conversationId); err != nil {
		common.ApiError(c, err)
		return
	} else if !owned {
		common.ApiErrorMsg(c, "conversation not found")
		return
	}

	var req chatConversationRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "invalid request body")
		return
	}

	updates := map[string]interface{}{}
	if strings.TrimSpace(req.Title) != "" {
		updates["title"] = model.NormalizeChatTitle(req.Title)
	}
	if strings.TrimSpace(req.Model) != "" {
		updates["model_name"] = strings.TrimSpace(req.Model)
	}
	if strings.TrimSpace(req.Group) != "" {
		updates["group"] = strings.TrimSpace(req.Group)
	}
	if len(updates) == 0 {
		common.ApiErrorMsg(c, "no fields to update")
		return
	}

	conversation, err := model.UpdateChatConversation(userId, conversationId, updates)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, conversation)
}

func DeleteChatConversation(c *gin.Context) {
	userId := c.GetInt("id")
	conversationId, ok := parseChatConversationId(c)
	if !ok {
		return
	}
	if _, owned, err := ensureChatConversationOwned(userId, conversationId); err != nil {
		common.ApiError(c, err)
		return
	} else if !owned {
		common.ApiErrorMsg(c, "conversation not found")
		return
	}

	if err := model.DeleteChatConversation(userId, conversationId); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func ListChatMessages(c *gin.Context) {
	userId := c.GetInt("id")
	conversationId, ok := parseChatConversationId(c)
	if !ok {
		return
	}
	if _, owned, err := ensureChatConversationOwned(userId, conversationId); err != nil {
		common.ApiError(c, err)
		return
	} else if !owned {
		common.ApiErrorMsg(c, "conversation not found")
		return
	}

	messages, err := model.ListChatMessages(userId, conversationId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, messages)
}

func AppendChatMessages(c *gin.Context) {
	userId := c.GetInt("id")
	conversationId, ok := parseChatConversationId(c)
	if !ok {
		return
	}
	if _, owned, err := ensureChatConversationOwned(userId, conversationId); err != nil {
		common.ApiError(c, err)
		return
	} else if !owned {
		common.ApiErrorMsg(c, "conversation not found")
		return
	}

	var req appendChatMessagesRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "invalid request body")
		return
	}
	if len(req.Messages) == 0 {
		common.ApiErrorMsg(c, "messages cannot be empty")
		return
	}
	if len(req.Messages) > 10 {
		common.ApiErrorMsg(c, "too many messages")
		return
	}

	messages := make([]*model.ChatMessage, 0, len(req.Messages))
	var latestModel string
	for _, item := range req.Messages {
		role := strings.TrimSpace(item.Role)
		content := strings.TrimSpace(item.Content)
		if !model.IsValidChatMessageRole(role) {
			common.ApiErrorMsg(c, "invalid message role")
			return
		}
		if role != model.ChatMessageRoleUser {
			common.ApiErrorMsg(c, "only user messages can be appended directly")
			return
		}
		if !validateChatContent(c, content) {
			return
		}
		modelName := strings.TrimSpace(item.Model)
		if modelName != "" {
			latestModel = modelName
		}
		messages = append(messages, &model.ChatMessage{
			Role:      role,
			Content:   content,
			ModelName: modelName,
		})
	}

	if err := model.CreateChatMessages(userId, conversationId, messages); err != nil {
		common.ApiError(c, err)
		return
	}
	_ = model.TouchChatConversation(userId, conversationId, latestModel, "")
	common.ApiSuccess(c, messages)
}

func SendChatMessage(c *gin.Context) {
	userId := c.GetInt("id")
	conversationId, ok := parseChatConversationId(c)
	if !ok {
		return
	}
	conversation, owned, err := ensureChatConversationOwned(userId, conversationId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !owned {
		common.ApiErrorMsg(c, "conversation not found")
		return
	}

	var req sendChatMessageRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "invalid request body")
		return
	}

	content := strings.TrimSpace(req.Content)
	if !validateChatContent(c, content) {
		return
	}
	modelName := strings.TrimSpace(req.Model)
	if modelName == "" {
		modelName = strings.TrimSpace(conversation.ModelName)
	}
	if modelName == "" {
		common.ApiErrorMsg(c, "model is required")
		return
	}
	group := strings.TrimSpace(req.Group)
	if group == "" {
		group = strings.TrimSpace(conversation.Group)
	}

	storedMessages, err := model.ListChatMessages(userId, conversationId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	userMessage := &model.ChatMessage{
		Role:      model.ChatMessageRoleUser,
		Content:   content,
		ModelName: modelName,
	}
	if err := model.CreateChatMessages(userId, conversationId, []*model.ChatMessage{userMessage}); err != nil {
		common.ApiError(c, err)
		return
	}
	_ = model.TouchChatConversation(userId, conversationId, modelName, group)

	stream := false
	completion, err := callChatCompletionRelay(c, &chatCompletionRelayRequest{
		Model:       modelName,
		Group:       group,
		Messages:    chatMessagesForCompletion(storedMessages, content),
		Stream:      &stream,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		TopP:        req.TopP,
	})
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	if len(completion.Choices) == 0 {
		common.ApiErrorMsg(c, "the model returned no choices")
		return
	}

	assistantContent := chatCompletionContentToString(completion.Choices[0].Message.Content)
	if assistantContent == "" {
		common.ApiErrorMsg(c, "the model returned an empty response")
		return
	}
	assistantModel := strings.TrimSpace(completion.Model)
	if assistantModel == "" {
		assistantModel = modelName
	}
	assistantMessage := &model.ChatMessage{
		Role:             model.ChatMessageRoleAssistant,
		Content:          assistantContent,
		ModelName:        assistantModel,
		PromptTokens:     completion.Usage.PromptTokens,
		CompletionTokens: completion.Usage.CompletionTokens,
	}
	if err := model.CreateChatMessages(userId, conversationId, []*model.ChatMessage{assistantMessage}); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.TouchChatConversation(userId, conversationId, assistantModel, group); err != nil {
		common.ApiError(c, err)
		return
	}
	conversation, err = model.GetChatConversationById(userId, conversationId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, sendChatMessageResponse{
		Conversation:     conversation,
		UserMessage:      userMessage,
		AssistantMessage: assistantMessage,
		Usage: chatMessageUsage{
			PromptTokens:     completion.Usage.PromptTokens,
			CompletionTokens: completion.Usage.CompletionTokens,
			TotalTokens:      completion.Usage.TotalTokens,
		},
	})
}
