package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	ChatMessageRoleSystem    = "system"
	ChatMessageRoleUser      = "user"
	ChatMessageRoleAssistant = "assistant"
)

type ChatConversation struct {
	Id        int            `json:"id"`
	UserId    int            `json:"user_id" gorm:"index:idx_chat_conversation_user_updated,priority:1"`
	Title     string         `json:"title" gorm:"type:varchar(128);default:''"`
	ModelName string         `json:"model_name" gorm:"type:varchar(128);default:'';index"`
	Group     string         `json:"group" gorm:"type:varchar(64);default:'';index"`
	CreatedAt int64          `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt int64          `json:"updated_at" gorm:"autoUpdateTime;index:idx_chat_conversation_user_updated,priority:2"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type ChatMessage struct {
	Id                    int            `json:"id"`
	ConversationId        int            `json:"conversation_id" gorm:"index:idx_chat_message_conversation_created,priority:1"`
	UserId                int            `json:"user_id" gorm:"index"`
	Role                  string         `json:"role" gorm:"type:varchar(32);index"`
	Content               string         `json:"content" gorm:"type:text"`
	ContentParts          string         `json:"content_parts,omitempty" gorm:"type:text"`
	ModelName             string         `json:"model_name" gorm:"type:varchar(128);default:'';index"`
	PromptTokens          int            `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens      int            `json:"completion_tokens" gorm:"default:0"`
	Quota                 int            `json:"quota" gorm:"default:0"`
	BillingSource         string         `json:"billing_source,omitempty" gorm:"type:varchar(32);default:'';index"`
	SubscriptionId        int            `json:"subscription_id,omitempty" gorm:"default:0"`
	SubscriptionPlanId    int            `json:"subscription_plan_id,omitempty" gorm:"default:0"`
	SubscriptionPlanTitle string         `json:"subscription_plan_title,omitempty" gorm:"type:varchar(128);default:''"`
	CreatedAt             int64          `json:"created_at" gorm:"autoCreateTime;index:idx_chat_message_conversation_created,priority:2"`
	DeletedAt             gorm.DeletedAt `gorm:"index"`
}

type ChatConversationUsage struct {
	ConversationId        int `json:"conversation_id"`
	MessageCount          int `json:"message_count"`
	UserMessageCount      int `json:"user_message_count"`
	AssistantMessageCount int `json:"assistant_message_count"`
	PromptTokens          int `json:"prompt_tokens"`
	CompletionTokens      int `json:"completion_tokens"`
	TotalTokens           int `json:"total_tokens"`
	Quota                 int `json:"quota"`
}

func IsValidChatMessageRole(role string) bool {
	switch role {
	case ChatMessageRoleSystem, ChatMessageRoleUser, ChatMessageRoleAssistant:
		return true
	default:
		return false
	}
}

func NormalizeChatTitle(title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return "New chat"
	}
	titleRunes := []rune(title)
	if len(titleRunes) > 128 {
		return string(titleRunes[:128])
	}
	return title
}

func ListChatConversations(userId int, startIdx int, num int) (conversations []*ChatConversation, err error) {
	err = DB.Where("user_id = ?", userId).
		Order("updated_at desc, id desc").
		Limit(num).
		Offset(startIdx).
		Find(&conversations).Error
	return conversations, err
}

func CountChatConversations(userId int) (count int64, err error) {
	err = DB.Model(&ChatConversation{}).Where("user_id = ?", userId).Count(&count).Error
	return count, err
}

func CreateChatConversation(userId int, title string, modelName string, group string) (*ChatConversation, error) {
	conversation := &ChatConversation{
		UserId:    userId,
		Title:     NormalizeChatTitle(title),
		ModelName: strings.TrimSpace(modelName),
		Group:     strings.TrimSpace(group),
	}
	if err := DB.Create(conversation).Error; err != nil {
		return nil, err
	}
	return conversation, nil
}

func GetChatConversationById(userId int, conversationId int) (*ChatConversation, error) {
	var conversation ChatConversation
	err := DB.Where("id = ? AND user_id = ?", conversationId, userId).First(&conversation).Error
	return &conversation, err
}

func UpdateChatConversation(userId int, conversationId int, updates map[string]interface{}) (*ChatConversation, error) {
	if len(updates) > 0 {
		if err := DB.Model(&ChatConversation{}).
			Where("id = ? AND user_id = ?", conversationId, userId).
			Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	return GetChatConversationById(userId, conversationId)
}

func TouchChatConversation(userId int, conversationId int, modelName string, group string) error {
	updates := map[string]interface{}{
		"updated_at": common.GetTimestamp(),
	}
	if strings.TrimSpace(modelName) != "" {
		updates["model_name"] = strings.TrimSpace(modelName)
	}
	if strings.TrimSpace(group) != "" {
		updates["group"] = strings.TrimSpace(group)
	}
	return DB.Model(&ChatConversation{}).
		Where("id = ? AND user_id = ?", conversationId, userId).
		Updates(updates).Error
}

func DeleteChatConversation(userId int, conversationId int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", conversationId, userId).
			Delete(&ChatConversation{}).Error; err != nil {
			return err
		}
		if err := tx.Where("conversation_id = ? AND user_id = ?", conversationId, userId).
			Delete(&ChatMessage{}).Error; err != nil {
			return err
		}
		return tx.Where("conversation_id = ? AND user_id = ?", conversationId, userId).
			Delete(&ChatAttachment{}).Error
	})
}

func ListChatMessages(userId int, conversationId int) (messages []*ChatMessage, err error) {
	err = DB.Where("conversation_id = ? AND user_id = ?", conversationId, userId).
		Order("created_at asc, id asc").
		Find(&messages).Error
	return messages, err
}

func GetChatConversationUsage(userId int, conversationId int) (*ChatConversationUsage, error) {
	var messages []ChatMessage
	err := DB.Model(&ChatMessage{}).
		Select("role", "prompt_tokens", "completion_tokens", "quota").
		Where("conversation_id = ? AND user_id = ?", conversationId, userId).
		Find(&messages).Error
	if err != nil {
		return nil, err
	}

	usage := &ChatConversationUsage{
		ConversationId: conversationId,
		MessageCount:   len(messages),
	}
	for _, message := range messages {
		switch message.Role {
		case ChatMessageRoleUser:
			usage.UserMessageCount++
		case ChatMessageRoleAssistant:
			usage.AssistantMessageCount++
		}
		usage.PromptTokens += message.PromptTokens
		usage.CompletionTokens += message.CompletionTokens
		usage.Quota += message.Quota
	}
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	return usage, nil
}

func CreateChatMessages(userId int, conversationId int, messages []*ChatMessage) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		for _, message := range messages {
			message.UserId = userId
			message.ConversationId = conversationId
			if err := tx.Create(message).Error; err != nil {
				return err
			}
		}
		return tx.Model(&ChatConversation{}).
			Where("id = ? AND user_id = ?", conversationId, userId).
			Update("updated_at", common.GetTimestamp()).Error
	})
}
