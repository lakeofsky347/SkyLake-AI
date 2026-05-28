package model

import "gorm.io/gorm"

type ChatAttachment struct {
	Id             int            `json:"id"`
	UserId         int            `json:"user_id" gorm:"index"`
	ConversationId int            `json:"conversation_id" gorm:"index:idx_chat_attachment_conversation_created,priority:1"`
	MessageId      int            `json:"message_id" gorm:"default:0;index"`
	StorageKey     string         `json:"storage_key" gorm:"type:varchar(96);uniqueIndex"`
	FileName       string         `json:"file_name" gorm:"type:varchar(255);default:''"`
	MimeType       string         `json:"mime_type" gorm:"type:varchar(128);default:''"`
	Size           int64          `json:"size" gorm:"default:0"`
	StoragePath    string         `json:"-" gorm:"type:text"`
	PublicURL      string         `json:"public_url" gorm:"type:text"`
	CreatedAt      int64          `json:"created_at" gorm:"autoCreateTime;index:idx_chat_attachment_conversation_created,priority:2"`
	DeletedAt      gorm.DeletedAt `gorm:"index"`
}

func CreateChatAttachment(userId int, conversationId int, attachment *ChatAttachment) error {
	attachment.UserId = userId
	attachment.ConversationId = conversationId
	return DB.Create(attachment).Error
}

func GetChatAttachmentByStorageKey(storageKey string) (*ChatAttachment, error) {
	var attachment ChatAttachment
	err := DB.Where("storage_key = ?", storageKey).First(&attachment).Error
	return &attachment, err
}

func GetChatAttachmentById(userId int, conversationId int, attachmentId int) (*ChatAttachment, error) {
	var attachment ChatAttachment
	err := DB.Where("id = ? AND user_id = ? AND conversation_id = ?", attachmentId, userId, conversationId).
		First(&attachment).Error
	return &attachment, err
}

func ListChatAttachments(userId int, conversationId int) ([]*ChatAttachment, error) {
	var attachments []*ChatAttachment
	err := DB.Where("user_id = ? AND conversation_id = ?", userId, conversationId).
		Order("created_at asc, id asc").
		Find(&attachments).Error
	return attachments, err
}

func ListPendingChatAttachments(userId int, conversationId int) ([]*ChatAttachment, error) {
	var attachments []*ChatAttachment
	err := DB.Where("user_id = ? AND conversation_id = ? AND message_id = 0", userId, conversationId).
		Order("created_at asc, id asc").
		Find(&attachments).Error
	return attachments, err
}

func CountPendingChatAttachments(userId int, conversationId int) (int64, error) {
	var count int64
	err := DB.Model(&ChatAttachment{}).
		Where("user_id = ? AND conversation_id = ? AND message_id = 0", userId, conversationId).
		Count(&count).Error
	return count, err
}

func DeleteChatAttachmentById(userId int, conversationId int, attachmentId int) error {
	return DB.Where("id = ? AND user_id = ? AND conversation_id = ?", attachmentId, userId, conversationId).
		Delete(&ChatAttachment{}).Error
}

func DeleteChatAttachmentsByIds(userId int, conversationId int, attachmentIds []int) error {
	if len(attachmentIds) == 0 {
		return nil
	}
	return DB.Where("user_id = ? AND conversation_id = ? AND id IN ?", userId, conversationId, attachmentIds).
		Delete(&ChatAttachment{}).Error
}

func BindChatAttachmentsToMessage(userId int, conversationId int, messageId int, publicURLs []string) error {
	if len(publicURLs) == 0 {
		return nil
	}
	return DB.Model(&ChatAttachment{}).
		Where("user_id = ? AND conversation_id = ? AND message_id = 0 AND public_url IN ?", userId, conversationId, publicURLs).
		Update("message_id", messageId).Error
}
