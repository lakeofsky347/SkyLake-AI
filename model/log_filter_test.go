package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func insertLogFilterUser(t *testing.T, id int, username string) {
	t.Helper()
	require.NoError(t, DB.Create(&User{
		Id:       id,
		Username: username,
		Password: "password123",
		Role:     common.RoleCommonUser,
		Status:   common.UserStatusEnabled,
		Group:    "default",
	}).Error)
}

func insertTestLog(t *testing.T, log *Log) {
	t.Helper()
	require.NoError(t, LOG_DB.Create(log).Error)
}

func TestGetUserLogs_FilterByClientAppAndBillingSource(t *testing.T) {
	truncateTables(t)
	insertLogFilterUser(t, 101, "alice")

	now := time.Now().Unix()
	insertTestLog(t, &Log{
		UserId:    101,
		Username:  "alice",
		CreatedAt: now - 3,
		Type:      LogTypeConsume,
		ModelName: "chat-subscription",
		Quota:     11,
		Other: common.MapToJsonStr(map[string]interface{}{
			"client_app":     "chat",
			"billing_source": "subscription",
			"request_path":   "/pg/chat/completions",
		}),
	})
	insertTestLog(t, &Log{
		UserId:    101,
		Username:  "alice",
		CreatedAt: now - 2,
		Type:      LogTypeConsume,
		ModelName: "api-wallet",
		Quota:     23,
		Other: common.MapToJsonStr(map[string]interface{}{
			"client_app":     "api",
			"billing_source": "wallet",
			"request_path":   "/v1/chat/completions",
		}),
	})
	insertTestLog(t, &Log{
		UserId:    101,
		Username:  "alice",
		CreatedAt: now - 1,
		Type:      LogTypeConsume,
		ModelName: "legacy-api-wallet",
		Quota:     29,
		Other: common.MapToJsonStr(map[string]interface{}{
			"billing_source": "wallet",
			"request_path":   "/v1/embeddings",
		}),
	})

	logs, total, err := GetUserLogs(101, LogTypeUnknown, 0, 0, "", "", 0, 20, "", "", "", "api", "wallet")
	require.NoError(t, err)
	require.EqualValues(t, 2, total)
	require.Len(t, logs, 2)

	modelNames := []string{logs[0].ModelName, logs[1].ModelName}
	assert.ElementsMatch(t, []string{"api-wallet", "legacy-api-wallet"}, modelNames)
}

func TestSumUsedQuota_FilterByClientAppAndBillingSource(t *testing.T) {
	truncateTables(t)
	insertLogFilterUser(t, 102, "bob")

	now := time.Now().Unix()
	insertTestLog(t, &Log{
		UserId:       102,
		Username:     "bob",
		CreatedAt:    now - 10,
		Type:         LogTypeConsume,
		ModelName:    "api-wallet-old",
		Quota:        17,
		PromptTokens: 100,
		Other: common.MapToJsonStr(map[string]interface{}{
			"billing_source": "wallet",
			"request_path":   "/v1/responses",
		}),
	})
	insertTestLog(t, &Log{
		UserId:       102,
		Username:     "bob",
		CreatedAt:    now - 9,
		Type:         LogTypeConsume,
		ModelName:    "api-wallet-new",
		Quota:        19,
		PromptTokens: 120,
		Other: common.MapToJsonStr(map[string]interface{}{
			"client_app":     "api",
			"billing_source": "wallet",
			"request_path":   "/v1/chat/completions",
		}),
	})
	insertTestLog(t, &Log{
		UserId:       102,
		Username:     "bob",
		CreatedAt:    now - 8,
		Type:         LogTypeConsume,
		ModelName:    "chat-subscription",
		Quota:        31,
		PromptTokens: 140,
		Other: common.MapToJsonStr(map[string]interface{}{
			"client_app":     "chat",
			"billing_source": "subscription",
			"request_path":   "/pg/chat/completions",
		}),
	})

	stat, err := SumUsedQuota(LogTypeConsume, 0, 0, "", "bob", "", 0, "", "", "", "api", "wallet")
	require.NoError(t, err)
	assert.Equal(t, 36, stat.Quota)
	assert.Equal(t, 2, stat.Rpm)
	assert.Equal(t, 220, stat.Tpm)
}
