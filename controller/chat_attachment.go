package controller

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

const (
	chatAttachmentStorageDir = "data/chat-attachments"
	chatMaxImageFileSize     = 10 * 1024 * 1024
)

var chatAllowedImageTypes = map[string]string{
	"image/gif":  ".gif",
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

func chatAttachmentPublicURL(c *gin.Context, storageKey string) string {
	path := "/api/chat/attachments/" + url.PathEscape(storageKey)
	base := strings.TrimRight(system_setting.ServerAddress, "/")
	if base != "" {
		return base + path
	}
	host := strings.TrimSpace(c.Request.Host)
	if host == "" {
		return path
	}
	scheme := "http"
	if forwardedProto := c.GetHeader("X-Forwarded-Proto"); forwardedProto != "" {
		scheme = strings.Split(forwardedProto, ",")[0]
	} else if c.Request.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + host + path
}

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

func createChatAttachmentStorageKey(mimeType string) (string, error) {
	ext, ok := chatAllowedImageTypes[mimeType]
	if !ok {
		return "", fmt.Errorf("unsupported image type")
	}
	randomKey, err := common.GenerateRandomCharsKey(40)
	if err != nil {
		return "", err
	}
	return randomKey + ext, nil
}

func detectChatAttachmentMimeType(file multipartFile) (string, error) {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	mimeType := http.DetectContentType(buffer[:n])
	if _, ok := chatAllowedImageTypes[mimeType]; !ok {
		return "", fmt.Errorf("unsupported image type")
	}
	return mimeType, nil
}

type multipartFile interface {
	io.Reader
	io.ReaderAt
	io.Seeker
	io.Closer
}

func saveChatAttachmentFile(file multipartFile, mimeType string) (string, string, int64, error) {
	if err := os.MkdirAll(chatAttachmentStorageDir, 0755); err != nil {
		return "", "", 0, err
	}
	storageKey, err := createChatAttachmentStorageKey(mimeType)
	if err != nil {
		return "", "", 0, err
	}
	storagePath := filepath.Join(chatAttachmentStorageDir, storageKey)
	dst, err := os.OpenFile(storagePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return "", "", 0, err
	}
	defer dst.Close()

	written, err := io.Copy(dst, io.LimitReader(file, chatMaxImageFileSize+1))
	if err != nil {
		_ = os.Remove(storagePath)
		return "", "", 0, err
	}
	if written > chatMaxImageFileSize {
		_ = os.Remove(storagePath)
		return "", "", 0, fmt.Errorf("image file is too large")
	}
	return storageKey, storagePath, written, nil
}

func removeChatAttachmentFiles(attachments []*model.ChatAttachment) {
	for _, attachment := range attachments {
		if strings.TrimSpace(attachment.StoragePath) == "" {
			continue
		}
		if err := os.Remove(attachment.StoragePath); err != nil && !os.IsNotExist(err) {
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
	if header.Size > chatMaxImageFileSize {
		common.ApiErrorMsg(c, "image file is too large")
		return
	}

	mimeType, err := detectChatAttachmentMimeType(file)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	storageKey, storagePath, size, err := saveChatAttachmentFile(file, mimeType)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	attachment := &model.ChatAttachment{
		StorageKey:  storageKey,
		FileName:    safeChatAttachmentFileName(header.Filename),
		MimeType:    mimeType,
		Size:        size,
		StoragePath: storagePath,
		PublicURL:   chatAttachmentPublicURL(c, storageKey),
	}
	if err := model.CreateChatAttachment(userId, conversationId, attachment); err != nil {
		_ = os.Remove(storagePath)
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, attachment)
}

func GetChatAttachmentContent(c *gin.Context) {
	storageKey := strings.TrimSpace(c.Param("key"))
	if storageKey == "" || strings.Contains(storageKey, "/") || strings.Contains(storageKey, "\\") {
		c.Status(http.StatusNotFound)
		return
	}
	attachment, err := model.GetChatAttachmentByStorageKey(storageKey)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("Content-Type", attachment.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", attachment.FileName))
	c.File(attachment.StoragePath)
}
