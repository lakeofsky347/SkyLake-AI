package controller

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func safeChatAttachmentFileName(fileName string) string {
	fileName = strings.TrimSpace(filepath.Base(fileName))
	if fileName == "." || fileName == string(filepath.Separator) {
		return "image"
	}
	if fileName == "" {
		return "image"
	}
	return fileName
}

func removeChatAttachmentFiles(attachments []*model.ChatAttachment) {
	storage := service.GetChatAttachmentStorage()
	for _, attachment := range attachments {
		if err := storage.Delete(attachment.StoragePath); err != nil {
			common.SysError("remove chat attachment error: " + err.Error())
		}
	}
}

func chatContentPartImageURLs(parts []dto.MediaContent) []string {
	urls := make([]string, 0)
	for _, part := range parts {
		if part.Type != dto.ContentTypeImageURL {
			continue
		}
		image := part.GetImageMedia()
		if image != nil && strings.TrimSpace(image.Url) != "" {
			urls = append(urls, strings.TrimSpace(image.Url))
		}
	}
	return urls
}

func bindChatMessageAttachments(userId int, conversationId int, message *model.ChatMessage, parts []dto.MediaContent) {
	if message == nil || message.Id == 0 {
		return
	}
	if err := model.BindChatAttachmentsToMessage(userId, conversationId, message.Id, chatContentPartImageURLs(parts)); err != nil {
		common.SysError("bind chat attachment error: " + err.Error())
	}
}

func UploadChatAttachment(c *gin.Context) {
	userId := c.GetInt("id")
	if c.GetInt("role") < common.ImageUploadPermission {
		common.ApiErrorMsg(c, "insufficient permission to upload images")
		return
	}
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

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		common.ApiErrorMsg(c, "image file is required")
		return
	}
	defer file.Close()
	if header.Size <= 0 {
		common.ApiErrorMsg(c, "image file is empty")
		return
	}
	if header.Size > service.ChatMaxImageFileSize {
		common.ApiErrorMsg(c, "image file is too large")
		return
	}

	savedFile, err := service.GetChatAttachmentStorage().SaveImage(c, file)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	attachment := &model.ChatAttachment{
		StorageKey:  savedFile.StorageKey,
		FileName:    safeChatAttachmentFileName(header.Filename),
		MimeType:    savedFile.MimeType,
		Size:        savedFile.Size,
		StoragePath: savedFile.StoragePath,
		PublicURL:   savedFile.PublicURL,
	}
	if err := model.CreateChatAttachment(userId, conversationId, attachment); err != nil {
		if deleteErr := service.GetChatAttachmentStorage().Delete(savedFile.StoragePath); deleteErr != nil {
			common.SysError("remove unsaved chat attachment error: " + deleteErr.Error())
		}
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, attachment)
}

func GetChatAttachmentContent(c *gin.Context) {
	storageKey := strings.TrimSpace(c.Param("key"))
	if !service.ValidChatAttachmentStorageKey(storageKey) {
		c.Status(http.StatusNotFound)
		return
	}
	attachment, err := model.GetChatAttachmentByStorageKey(storageKey)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	service.GetChatAttachmentStorage().Serve(c, attachment.StoragePath, attachment.MimeType, attachment.FileName)
}
