package controller

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
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
	chatMaxContentParts = 16
	chatMaxPartsBytes   = 60 * 1024
)

type chatConversationRequest struct {
	Title string `json:"title"`
	Model string `json:"model"`
	Group string `json:"group"`
}

type chatMessageRequest struct {
	Role             string `json:"role"`
	Content          string `json:"content"`
	ContentParts     []chatMessageContentPartRequest `json:"content_parts,omitempty"`
	Model            string `json:"model"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	Quota            int    `json:"quota"`
}

type appendChatMessagesRequest struct {
	Messages []chatMessageRequest `json:"messages"`
}

type sendChatMessageRequest struct {
	Content      string                          `json:"content"`
	ContentParts []chatMessageContentPartRequest `json:"content_parts,omitempty"`
	Model        string                          `json:"model"`
	Group        string                          `json:"group"`
	MaxTokens    *uint                           `json:"max_tokens,omitempty"`
	Temperature  *float64                        `json:"temperature,omitempty"`
	TopP         *float64                        `json:"top_p,omitempty"`
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

type chatMessageContentPartRequest struct {
	Type     string                          `json:"type"`
	Text     string                          `json:"text,omitempty"`
	ImageURL *chatMessageImageURLPartRequest `json:"image_url,omitempty"`
}

type chatMessageImageURLPartRequest struct {
	URL    string `json:"url"`
	Detail string `json:"detail,omitempty"`
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

type chatStreamCaptureWriter struct {
	http.ResponseWriter
	body        bytes.Buffer
	statusCode  int
	wroteHeader bool
}

type chatStreamCaptureResult struct {
	Content string
	Model   string
	Usage   chatMessageUsage
	Done    bool
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

func isValidChatImageURL(rawURL string) bool {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func appendChatTextPart(parts []dto.MediaContent, text string) []dto.MediaContent {
	text = strings.TrimSpace(text)
	if text == "" {
		return parts
	}
	return append(parts, dto.MediaContent{
		Type: dto.ContentTypeText,
		Text: text,
	})
}

func chatImageURLPart(rawURL string, detail string) dto.MediaContent {
	image := map[string]any{
		"url": strings.TrimSpace(rawURL),
	}
	if strings.TrimSpace(detail) != "" {
		image["detail"] = strings.TrimSpace(detail)
	}
	return dto.MediaContent{
		Type:     dto.ContentTypeImageURL,
		ImageUrl: image,
	}
}

func normalizeChatMessageContent(content string, rawParts []chatMessageContentPartRequest) (string, []dto.MediaContent, string, error) {
	content = strings.TrimSpace(content)
	if len(rawParts) == 0 {
		if len([]rune(content)) > chatMaxMessageChars {
			return "", nil, "", fmt.Errorf("message content is too long")
		}
		if content == "" {
			return "", nil, "", fmt.Errorf("message content cannot be empty")
		}
		return content, nil, "", nil
	}
	if len(rawParts) > chatMaxContentParts {
		return "", nil, "", fmt.Errorf("too many content parts")
	}

	parts := make([]dto.MediaContent, 0, len(rawParts)+1)
	hasText := false
	hasMedia := false
	var textSummary strings.Builder
	for _, rawPart := range rawParts {
		switch strings.TrimSpace(rawPart.Type) {
		case dto.ContentTypeText:
			text := strings.TrimSpace(rawPart.Text)
			if text == "" {
				continue
			}
			hasText = true
			if textSummary.Len() > 0 {
				textSummary.WriteString("\n")
			}
			textSummary.WriteString(text)
			parts = appendChatTextPart(parts, text)
		case dto.ContentTypeImageURL:
			if rawPart.ImageURL == nil {
				return "", nil, "", fmt.Errorf("image URL is required")
			}
			imageURL := strings.TrimSpace(rawPart.ImageURL.URL)
			if !isValidChatImageURL(imageURL) {
				return "", nil, "", fmt.Errorf("image URL must start with http or https")
			}
			hasMedia = true
			parts = append(parts, chatImageURLPart(imageURL, rawPart.ImageURL.Detail))
		default:
			return "", nil, "", fmt.Errorf("unsupported content part type")
		}
	}

	if content != "" && !hasText {
		parts = append([]dto.MediaContent{{
			Type: dto.ContentTypeText,
			Text: content,
		}}, parts...)
		textSummary.WriteString(content)
		hasText = true
	}

	summary := strings.TrimSpace(textSummary.String())
	if summary == "" && hasMedia {
		summary = "[Image]"
	}
	if len([]rune(summary)) > chatMaxMessageChars {
		return "", nil, "", fmt.Errorf("message content is too long")
	}
	if summary == "" || len(parts) == 0 {
		return "", nil, "", fmt.Errorf("message content cannot be empty")
	}

	if !hasMedia {
		return summary, nil, "", nil
	}
	data, err := common.Marshal(parts)
	if err != nil {
		return "", nil, "", err
	}
	if len(data) > chatMaxPartsBytes {
		return "", nil, "", fmt.Errorf("content parts are too large")
	}
	return summary, parts, string(data), nil
}

func parseStoredChatContentParts(raw string) []dto.MediaContent {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var parts []dto.MediaContent
	if err := common.UnmarshalJsonStr(raw, &parts); err != nil {
		return nil
	}
	return parts
}

func chatMessageContentForCompletion(message *model.ChatMessage) any {
	parts := parseStoredChatContentParts(message.ContentParts)
	if len(parts) > 0 {
		return parts
	}
	return strings.TrimSpace(message.Content)
}

func chatMessagesForCompletion(storedMessages []*model.ChatMessage, userContent string, userContentParts []dto.MediaContent) []dto.Message {
	messages := make([]dto.Message, 0, len(storedMessages)+1)
	for _, message := range storedMessages {
		role := strings.TrimSpace(message.Role)
		content := chatMessageContentForCompletion(message)
		if !model.IsValidChatMessageRole(role) {
			continue
		}
		if contentText, ok := content.(string); ok && contentText == "" {
			continue
		}
		messages = append(messages, dto.Message{
			Role:    role,
			Content: content,
		})
	}
	content := any(userContent)
	if len(userContentParts) > 0 {
		content = userContentParts
	}
	messages = append(messages, dto.Message{
		Role:    model.ChatMessageRoleUser,
		Content: content,
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

func newChatStreamCaptureWriter(writer http.ResponseWriter) *chatStreamCaptureWriter {
	return &chatStreamCaptureWriter{
		ResponseWriter: writer,
		statusCode:     http.StatusOK,
	}
}

func (w *chatStreamCaptureWriter) WriteHeader(statusCode int) {
	if w.wroteHeader {
		return
	}
	w.statusCode = statusCode
	w.wroteHeader = true
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *chatStreamCaptureWriter) Write(data []byte) (int, error) {
	_, _ = w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

func (w *chatStreamCaptureWriter) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (w *chatStreamCaptureWriter) StatusCode() int {
	return w.statusCode
}

func (w *chatStreamCaptureWriter) BodyBytes() []byte {
	return w.body.Bytes()
}

func callChatCompletionRelayStream(c *gin.Context, request *chatCompletionRelayRequest) ([]byte, int, error) {
	requestBody, err := common.Marshal(request)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	relayRequest := httptest.NewRequest(http.MethodPost, "/pg/chat/completions", bytes.NewReader(requestBody))
	relayRequest = relayRequest.WithContext(c.Request.Context())
	relayRequest.Header = c.Request.Header.Clone()
	relayRequest.Header.Set("Content-Type", "application/json")
	relayRequest.Header.Set("Accept", "text/event-stream")
	relayRequest.ContentLength = int64(len(requestBody))

	writer := newChatStreamCaptureWriter(c.Writer)
	router := gin.New()
	router.Use(middleware.BodyStorageCleanup())
	playgroundRoute := router.Group("/pg")
	playgroundRoute.Use(middleware.RouteTag("relay"))
	playgroundRoute.Use(middleware.SystemPerformanceCheck())
	playgroundRoute.Use(copyChatRelayContext(c), middleware.Distribute())
	playgroundRoute.POST("/chat/completions", Playground)
	router.ServeHTTP(writer, relayRequest)

	statusCode := writer.StatusCode()
	responseBody := writer.BodyBytes()
	if statusCode < http.StatusOK || statusCode >= http.StatusMultipleChoices {
		return responseBody, statusCode, fmt.Errorf("%s", chatRelayErrorMessage(responseBody))
	}
	return responseBody, statusCode, nil
}

func parseChatStreamCapture(data []byte) chatStreamCaptureResult {
	var result chatStreamCaptureResult
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" {
			continue
		}
		if payload == "[DONE]" {
			result.Done = true
			continue
		}

		var response dto.ChatCompletionsStreamResponse
		if err := common.UnmarshalJsonStr(payload, &response); err != nil {
			continue
		}
		if strings.TrimSpace(response.Model) != "" {
			result.Model = strings.TrimSpace(response.Model)
		}
		if response.Usage != nil {
			result.Usage = chatMessageUsage{
				PromptTokens:     response.Usage.PromptTokens,
				CompletionTokens: response.Usage.CompletionTokens,
				TotalTokens:      response.Usage.TotalTokens,
			}
		}
		for _, choice := range response.Choices {
			result.Content += choice.Delta.GetContentString()
		}
	}
	result.Content = strings.TrimSpace(result.Content)
	return result
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

func StreamChatMessage(c *gin.Context) {
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

	content, contentParts, contentPartsJSON, err := normalizeChatMessageContent(req.Content, req.ContentParts)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
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
		Role:         model.ChatMessageRoleUser,
		Content:      content,
		ContentParts: contentPartsJSON,
		ModelName:    modelName,
	}
	if err := model.CreateChatMessages(userId, conversationId, []*model.ChatMessage{userMessage}); err != nil {
		common.ApiError(c, err)
		return
	}
	bindChatMessageAttachments(userId, conversationId, userMessage, contentParts)
	_ = model.TouchChatConversation(userId, conversationId, modelName, group)

	stream := true
	responseBody, _, err := callChatCompletionRelayStream(c, &chatCompletionRelayRequest{
		Model:       modelName,
		Group:       group,
		Messages:    chatMessagesForCompletion(storedMessages, content, contentParts),
		Stream:      &stream,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		TopP:        req.TopP,
	})
	if err != nil {
		return
	}

	streamResult := parseChatStreamCapture(responseBody)
	if !streamResult.Done || c.Request.Context().Err() != nil {
		return
	}
	if streamResult.Content == "" {
		return
	}
	assistantModel := streamResult.Model
	if assistantModel == "" {
		assistantModel = modelName
	}
	assistantMessage := &model.ChatMessage{
		Role:             model.ChatMessageRoleAssistant,
		Content:          streamResult.Content,
		ModelName:        assistantModel,
		PromptTokens:     streamResult.Usage.PromptTokens,
		CompletionTokens: streamResult.Usage.CompletionTokens,
	}
	if err := model.CreateChatMessages(userId, conversationId, []*model.ChatMessage{assistantMessage}); err != nil {
		common.SysError("save stream chat message error: " + err.Error())
		return
	}
	if err := model.TouchChatConversation(userId, conversationId, assistantModel, group); err != nil {
		common.SysError("touch stream chat conversation error: " + err.Error())
	}
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

	attachments, err := model.ListChatAttachments(userId, conversationId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DeleteChatConversation(userId, conversationId); err != nil {
		common.ApiError(c, err)
		return
	}
	removeChatAttachmentFiles(attachments)
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
	messageContentParts := make([][]dto.MediaContent, 0, len(req.Messages))
	var latestModel string
	for _, item := range req.Messages {
		role := strings.TrimSpace(item.Role)
		if !model.IsValidChatMessageRole(role) {
			common.ApiErrorMsg(c, "invalid message role")
			return
		}
		if role != model.ChatMessageRoleUser {
			common.ApiErrorMsg(c, "only user messages can be appended directly")
			return
		}
		content, contentParts, contentPartsJSON, err := normalizeChatMessageContent(item.Content, item.ContentParts)
		if err != nil {
			common.ApiErrorMsg(c, err.Error())
			return
		}
		modelName := strings.TrimSpace(item.Model)
		if modelName != "" {
			latestModel = modelName
		}
		messages = append(messages, &model.ChatMessage{
			Role:         role,
			Content:      content,
			ContentParts: contentPartsJSON,
			ModelName:    modelName,
		})
		messageContentParts = append(messageContentParts, contentParts)
	}

	if err := model.CreateChatMessages(userId, conversationId, messages); err != nil {
		common.ApiError(c, err)
		return
	}
	for index, message := range messages {
		bindChatMessageAttachments(userId, conversationId, message, messageContentParts[index])
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

	content, contentParts, contentPartsJSON, err := normalizeChatMessageContent(req.Content, req.ContentParts)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
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
		Role:         model.ChatMessageRoleUser,
		Content:      content,
		ContentParts: contentPartsJSON,
		ModelName:    modelName,
	}
	if err := model.CreateChatMessages(userId, conversationId, []*model.ChatMessage{userMessage}); err != nil {
		common.ApiError(c, err)
		return
	}
	bindChatMessageAttachments(userId, conversationId, userMessage, contentParts)
	_ = model.TouchChatConversation(userId, conversationId, modelName, group)

	stream := false
	completion, err := callChatCompletionRelay(c, &chatCompletionRelayRequest{
		Model:       modelName,
		Group:       group,
		Messages:    chatMessagesForCompletion(storedMessages, content, contentParts),
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
