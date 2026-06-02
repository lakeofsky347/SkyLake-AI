package controller

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

type setupAPIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func TestPostSetupDefaultsToNewFrontend(t *testing.T) {
	db := setupRegisterControllerTestDB(t)

	if err := db.AutoMigrate(&model.Option{}, &model.Setup{}); err != nil {
		t.Fatalf("failed to migrate setup tables: %v", err)
	}

	oldSetup := constant.Setup
	oldSelfUseModeEnabled := operation_setting.SelfUseModeEnabled
	oldDemoSiteEnabled := operation_setting.DemoSiteEnabled
	oldOptionMap := common.OptionMap
	oldTheme := common.GetTheme()

	constant.Setup = false
	operation_setting.SelfUseModeEnabled = false
	operation_setting.DemoSiteEnabled = false
	common.OptionMap = make(map[string]string)
	common.SetTheme("classic")

	t.Cleanup(func() {
		constant.Setup = oldSetup
		operation_setting.SelfUseModeEnabled = oldSelfUseModeEnabled
		operation_setting.DemoSiteEnabled = oldDemoSiteEnabled
		common.OptionMap = oldOptionMap
		common.SetTheme(oldTheme)
	})

	payload := SetupRequest{
		Username:        "setupadmin",
		Password:        "password123",
		ConfirmPassword: "password123",
	}
	body, err := common.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal setup payload: %v", err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/setup", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	PostSetup(c)

	if w.Code != http.StatusOK {
		t.Fatalf("PostSetup returned status %d, want %d", w.Code, http.StatusOK)
	}

	var response setupAPIResponse
	if err := common.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal setup response: %v", err)
	}
	if !response.Success {
		t.Fatalf("PostSetup success = false, message: %s", response.Message)
	}

	var themeOption model.Option
	if err := db.Where("key = ?", "theme.frontend").First(&themeOption).Error; err != nil {
		t.Fatalf("failed to load theme option: %v", err)
	}
	if themeOption.Value != "default" {
		t.Fatalf("theme.frontend = %q, want %q", themeOption.Value, "default")
	}

	if common.GetTheme() != "default" {
		t.Fatalf("common.GetTheme() = %q, want %q", common.GetTheme(), "default")
	}

	if !constant.Setup {
		t.Fatalf("constant.Setup = false, want true")
	}
}
