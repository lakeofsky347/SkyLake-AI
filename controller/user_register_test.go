package controller

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

type registerAPIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func setupRegisterControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	gin.SetMode(gin.TestMode)

	oldUsingSQLite := common.UsingSQLite
	oldUsingMySQL := common.UsingMySQL
	oldUsingPostgreSQL := common.UsingPostgreSQL
	oldRedisEnabled := common.RedisEnabled
	oldRegisterEnabled := common.RegisterEnabled
	oldPasswordRegisterEnabled := common.PasswordRegisterEnabled
	oldEmailVerificationEnabled := common.EmailVerificationEnabled
	oldQuotaForNewUser := common.QuotaForNewUser
	oldQuotaForInvitee := common.QuotaForInvitee
	oldQuotaForInviter := common.QuotaForInviter
	oldGenerateDefaultToken := constant.GenerateDefaultToken
	oldDB := model.DB
	oldLogDB := model.LOG_DB

	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false
	common.RedisEnabled = false
	common.RegisterEnabled = true
	common.PasswordRegisterEnabled = true
	common.EmailVerificationEnabled = false
	common.QuotaForNewUser = 0
	common.QuotaForInvitee = 0
	common.QuotaForInviter = 0
	constant.GenerateDefaultToken = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	model.DB = db
	model.LOG_DB = db

	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("failed to migrate users table: %v", err)
	}

	t.Cleanup(func() {
		common.UsingSQLite = oldUsingSQLite
		common.UsingMySQL = oldUsingMySQL
		common.UsingPostgreSQL = oldUsingPostgreSQL
		common.RedisEnabled = oldRedisEnabled
		common.RegisterEnabled = oldRegisterEnabled
		common.PasswordRegisterEnabled = oldPasswordRegisterEnabled
		common.EmailVerificationEnabled = oldEmailVerificationEnabled
		common.QuotaForNewUser = oldQuotaForNewUser
		common.QuotaForInvitee = oldQuotaForInvitee
		common.QuotaForInviter = oldQuotaForInviter
		constant.GenerateDefaultToken = oldGenerateDefaultToken
		model.DB = oldDB
		model.LOG_DB = oldLogDB

		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

func performRegisterRequest(t *testing.T, payload model.User) registerAPIResponse {
	t.Helper()

	body, err := common.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal register payload: %v", err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/user/register", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	Register(c)

	if w.Code != http.StatusOK {
		t.Fatalf("Register returned status %d, want %d", w.Code, http.StatusOK)
	}

	var response registerAPIResponse
	if err := common.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal register response: %v", err)
	}
	return response
}

func TestRegisterRequiresEmailVerificationWhenSettingDisabled(t *testing.T) {
	db := setupRegisterControllerTestDB(t)

	response := performRegisterRequest(t, model.User{
		Username: "alice",
		Password: "password123",
	})

	if response.Success {
		t.Fatalf("Register success = true, want false")
	}

	var count int64
	if err := db.Model(&model.User{}).Count(&count).Error; err != nil {
		t.Fatalf("failed to count users: %v", err)
	}
	if count != 0 {
		t.Fatalf("user count = %d, want 0", count)
	}
}

func TestRegisterWithEmailVerificationStoresEmailAndConsumesCode(t *testing.T) {
	db := setupRegisterControllerTestDB(t)
	email := "bob@example.com"
	code := "123456"
	common.RegisterVerificationCodeWithKey(email, code, common.EmailVerificationPurpose)
	t.Cleanup(func() {
		common.DeleteKey(email, common.EmailVerificationPurpose)
	})

	response := performRegisterRequest(t, model.User{
		Username:         "bob",
		Password:         "password123",
		Email:            email,
		VerificationCode: code,
	})

	if !response.Success {
		t.Fatalf("Register success = false, message: %s", response.Message)
	}

	var user model.User
	if err := db.Where("username = ?", "bob").First(&user).Error; err != nil {
		t.Fatalf("failed to load registered user: %v", err)
	}
	if user.Email != email {
		t.Fatalf("registered email = %q, want %q", user.Email, email)
	}
	if common.VerifyCodeWithKey(email, code, common.EmailVerificationPurpose) {
		t.Fatalf("verification code was not consumed after successful registration")
	}
}

func TestRegisterRejectsInvalidEmailVerificationCode(t *testing.T) {
	db := setupRegisterControllerTestDB(t)
	email := "carol@example.com"
	common.RegisterVerificationCodeWithKey(email, "123456", common.EmailVerificationPurpose)
	t.Cleanup(func() {
		common.DeleteKey(email, common.EmailVerificationPurpose)
	})

	response := performRegisterRequest(t, model.User{
		Username:         "carol",
		Password:         "password123",
		Email:            email,
		VerificationCode: "654321",
	})

	if response.Success {
		t.Fatalf("Register success = true, want false")
	}

	var count int64
	if err := db.Model(&model.User{}).Count(&count).Error; err != nil {
		t.Fatalf("failed to count users: %v", err)
	}
	if count != 0 {
		t.Fatalf("user count = %d, want 0", count)
	}
}
