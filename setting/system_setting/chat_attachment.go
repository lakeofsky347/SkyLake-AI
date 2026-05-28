package system_setting

import (
	"strings"

	"github.com/QuantumNous/new-api/setting/config"
)

const (
	DefaultChatAttachmentLocalDir          = "data/chat-attachments"
	DefaultChatAttachmentMaxImageFileSizeMB = 10
	DefaultChatAttachmentMaxImageCount      = 8
	MaxChatAttachmentImageCount             = 16
)

var defaultChatAttachmentAllowedImageMimeTypes = []string{
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/webp",
}

type ChatAttachmentSettings struct {
	LocalDir              string   `json:"local_dir"`
	PublicBaseURL         string   `json:"public_base_url"`
	MaxImageFileSizeMB    int      `json:"max_image_file_size_mb"`
	MaxImageCount         int      `json:"max_image_count"`
	AllowedImageMimeTypes []string `json:"allowed_image_mime_types"`
}

var chatAttachmentSettings = ChatAttachmentSettings{
	LocalDir:              DefaultChatAttachmentLocalDir,
	PublicBaseURL:         "",
	MaxImageFileSizeMB:    DefaultChatAttachmentMaxImageFileSizeMB,
	MaxImageCount:         DefaultChatAttachmentMaxImageCount,
	AllowedImageMimeTypes: append([]string(nil), defaultChatAttachmentAllowedImageMimeTypes...),
}

func init() {
	config.GlobalConfig.Register("chat_attachment", &chatAttachmentSettings)
}

func GetChatAttachmentSettings() *ChatAttachmentSettings {
	return &chatAttachmentSettings
}

func GetChatAttachmentLocalDir() string {
	localDir := strings.TrimSpace(chatAttachmentSettings.LocalDir)
	if localDir == "" {
		return DefaultChatAttachmentLocalDir
	}
	return localDir
}

func GetChatAttachmentPublicBaseURL() string {
	return strings.TrimRight(strings.TrimSpace(chatAttachmentSettings.PublicBaseURL), "/")
}

func GetChatAttachmentMaxImageFileSizeBytes() int64 {
	sizeMB := chatAttachmentSettings.MaxImageFileSizeMB
	if sizeMB <= 0 {
		sizeMB = DefaultChatAttachmentMaxImageFileSizeMB
	}
	return int64(sizeMB) * 1024 * 1024
}

func GetChatAttachmentMaxImageCount() int {
	count := chatAttachmentSettings.MaxImageCount
	if count <= 0 {
		count = DefaultChatAttachmentMaxImageCount
	}
	if count > MaxChatAttachmentImageCount {
		count = MaxChatAttachmentImageCount
	}
	return count
}

func GetChatAttachmentAllowedImageMimeTypes() []string {
	mimeTypes := make([]string, 0, len(chatAttachmentSettings.AllowedImageMimeTypes))
	seen := make(map[string]struct{})
	for _, item := range chatAttachmentSettings.AllowedImageMimeTypes {
		mimeType := strings.TrimSpace(item)
		if mimeType == "" {
			continue
		}
		if _, ok := seen[mimeType]; ok {
			continue
		}
		seen[mimeType] = struct{}{}
		mimeTypes = append(mimeTypes, mimeType)
	}
	if len(mimeTypes) == 0 {
		return append([]string(nil), defaultChatAttachmentAllowedImageMimeTypes...)
	}
	return mimeTypes
}
