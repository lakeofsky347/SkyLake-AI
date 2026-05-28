package controller

import (
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"
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

func cleanupUnusedPendingChatAttachments(userId int, conversationId int, parts []dto.MediaContent) {
	attachments, err := model.ListPendingChatAttachments(userId, conversationId)
	if err != nil {
		common.SysError("list pending chat attachments error: " + err.Error())
		return
	}
	if len(attachments) == 0 {
		return
	}

	keepURLs := make(map[string]struct{}, len(parts))
	for _, url := range chatContentPartImageURLs(parts) {
		trimmedURL := strings.TrimSpace(url)
		if trimmedURL == "" {
			continue
		}
		keepURLs[trimmedURL] = struct{}{}
	}

	removable := make([]*model.ChatAttachment, 0, len(attachments))
	removableIDs := make([]int, 0, len(attachments))
	for _, attachment := range attachments {
		if _, ok := keepURLs[strings.TrimSpace(attachment.PublicURL)]; ok {
			continue
		}
		removable = append(removable, attachment)
		removableIDs = append(removableIDs, attachment.Id)
	}
	if len(removableIDs) == 0 {
		return
	}

	if err := model.DeleteChatAttachmentsByIds(userId, conversationId, removableIDs); err != nil {
		common.SysError("delete pending chat attachments error: " + err.Error())
		return
	}
	removeChatAttachmentFiles(removable)
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
	pendingCount, err := model.CountPendingChatAttachments(userId, conversationId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if pendingCount >= int64(system_setting.GetChatAttachmentMaxImageCount()) {
		common.ApiErrorMsg(c, "too many pending chat attachments")
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
	if header.Size > service.GetChatAttachmentMaxImageFileSize() {
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

func ListPendingChatAttachments(c *gin.Context) {
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

	attachments, err := model.ListPendingChatAttachments(userId, conversationId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, attachments)
}

func DeleteChatAttachment(c *gin.Context) {
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

	attachmentId, err := strconv.Atoi(strings.TrimSpace(c.Param("attachmentId")))
	if err != nil || attachmentId <= 0 {
		common.ApiErrorMsg(c, "invalid attachment id")
		return
	}

	attachment, err := model.GetChatAttachmentById(userId, conversationId, attachmentId)
	if err != nil {
		common.ApiErrorMsg(c, "attachment not found")
		return
	}
	if attachment.MessageId != 0 {
		common.ApiErrorMsg(c, "attachment already sent")
		return
	}

	if err := model.DeleteChatAttachmentById(userId, conversationId, attachmentId); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.GetChatAttachmentStorage().Delete(attachment.StoragePath); err != nil {
		common.SysError("remove chat attachment error: " + err.Error())
	}
	common.ApiSuccess(c, nil)
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
