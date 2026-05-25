package controller

import (
	"errors"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
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
	var latestGroup string
	for _, item := range req.Messages {
		role := strings.TrimSpace(item.Role)
		content := strings.TrimSpace(item.Content)
		if !model.IsValidChatMessageRole(role) {
			common.ApiErrorMsg(c, "invalid message role")
			return
		}
		if content == "" {
			common.ApiErrorMsg(c, "message content cannot be empty")
			return
		}
		if len([]rune(content)) > chatMaxMessageChars {
			common.ApiErrorMsg(c, "message content is too long")
			return
		}
		modelName := strings.TrimSpace(item.Model)
		if modelName != "" {
			latestModel = modelName
		}
		messages = append(messages, &model.ChatMessage{
			Role:             role,
			Content:          content,
			ModelName:        modelName,
			PromptTokens:     item.PromptTokens,
			CompletionTokens: item.CompletionTokens,
			Quota:            item.Quota,
		})
	}

	if err := model.CreateChatMessages(userId, conversationId, messages); err != nil {
		common.ApiError(c, err)
		return
	}
	_ = model.TouchChatConversation(userId, conversationId, latestModel, latestGroup)
	common.ApiSuccess(c, messages)
}
