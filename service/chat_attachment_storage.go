package service

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

const chatAttachmentRoutePrefix = "/api/chat/attachments/"

var chatImageTypeExtensions = map[string]string{
	"image/gif":  ".gif",
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

func defaultChatAttachmentImageMimeTypes() []string {
	return []string{
		"image/gif",
		"image/jpeg",
		"image/png",
		"image/webp",
	}
}

type ChatAttachmentFile interface {
	io.Reader
	io.ReaderAt
	io.Seeker
	io.Closer
}

type ChatAttachmentSaveResult struct {
	StorageKey  string
	StoragePath string
	MimeType    string
	Size        int64
	PublicURL   string
}

type ChatAttachmentStorage interface {
	SaveImage(c *gin.Context, file ChatAttachmentFile) (*ChatAttachmentSaveResult, error)
	Delete(storagePath string) error
	Serve(c *gin.Context, storagePath string, mimeType string, fileName string)
}

type LocalChatAttachmentStorage struct {
	BaseDir string
}

func NewLocalChatAttachmentStorage() *LocalChatAttachmentStorage {
	return &LocalChatAttachmentStorage{BaseDir: system_setting.GetChatAttachmentLocalDir()}
}

func GetChatAttachmentStorage() ChatAttachmentStorage {
	return NewLocalChatAttachmentStorage()
}

func GetAllowedChatAttachmentImageMimeTypes() []string {
	mimeTypes := make([]string, 0)
	for _, mimeType := range system_setting.GetChatAttachmentAllowedImageMimeTypes() {
		if _, ok := chatImageTypeExtensions[mimeType]; ok {
			mimeTypes = append(mimeTypes, mimeType)
		}
	}
	if len(mimeTypes) == 0 {
		for _, mimeType := range defaultChatAttachmentImageMimeTypes() {
			if _, ok := chatImageTypeExtensions[mimeType]; ok {
				mimeTypes = append(mimeTypes, mimeType)
			}
		}
	}
	return mimeTypes
}

func GetChatAttachmentMaxImageFileSize() int64 {
	return system_setting.GetChatAttachmentMaxImageFileSizeBytes()
}

func IsSupportedChatAttachmentImageType(mimeType string) bool {
	for _, allowedMimeType := range GetAllowedChatAttachmentImageMimeTypes() {
		if mimeType == allowedMimeType {
			return true
		}
	}
	return false
}

func ValidChatAttachmentStorageKey(storageKey string) bool {
	return strings.TrimSpace(storageKey) != "" &&
		!strings.Contains(storageKey, "/") &&
		!strings.Contains(storageKey, "\\")
}

func BuildChatAttachmentPublicURL(c *gin.Context, storageKey string) string {
	path := chatAttachmentRoutePrefix + url.PathEscape(storageKey)
	base := system_setting.GetChatAttachmentPublicBaseURL()
	if base != "" {
		return base + path
	}
	base = strings.TrimRight(system_setting.ServerAddress, "/")
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

func DetectChatAttachmentImageMimeType(file ChatAttachmentFile) (string, error) {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	mimeType := http.DetectContentType(buffer[:n])
	if !IsSupportedChatAttachmentImageType(mimeType) {
		return "", fmt.Errorf("unsupported image type")
	}
	return mimeType, nil
}

func createChatAttachmentStorageKey(mimeType string) (string, error) {
	ext, ok := chatImageTypeExtensions[mimeType]
	if !ok {
		return "", fmt.Errorf("unsupported image type")
	}
	randomKey, err := common.GenerateRandomCharsKey(40)
	if err != nil {
		return "", err
	}
	return randomKey + ext, nil
}

func (s *LocalChatAttachmentStorage) SaveImage(c *gin.Context, file ChatAttachmentFile) (*ChatAttachmentSaveResult, error) {
	mimeType, err := DetectChatAttachmentImageMimeType(file)
	if err != nil {
		return nil, err
	}
	maxImageFileSize := GetChatAttachmentMaxImageFileSize()
	if err := os.MkdirAll(s.BaseDir, 0755); err != nil {
		return nil, err
	}
	storageKey, err := createChatAttachmentStorageKey(mimeType)
	if err != nil {
		return nil, err
	}
	storagePath := filepath.Join(s.BaseDir, storageKey)
	dst, err := os.OpenFile(storagePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	written, err := io.Copy(dst, io.LimitReader(file, maxImageFileSize+1))
	if err != nil {
		_ = os.Remove(storagePath)
		return nil, err
	}
	if written > maxImageFileSize {
		_ = os.Remove(storagePath)
		return nil, fmt.Errorf("image file is too large")
	}
	return &ChatAttachmentSaveResult{
		StorageKey:  storageKey,
		StoragePath: storagePath,
		MimeType:    mimeType,
		Size:        written,
		PublicURL:   BuildChatAttachmentPublicURL(c, storageKey),
	}, nil
}

func (s *LocalChatAttachmentStorage) Delete(storagePath string) error {
	if strings.TrimSpace(storagePath) == "" {
		return nil
	}
	if err := os.Remove(storagePath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *LocalChatAttachmentStorage) Serve(c *gin.Context, storagePath string, mimeType string, fileName string) {
	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("Content-Type", mimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", fileName))
	c.File(storagePath)
}
