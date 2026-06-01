package service

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func newBillingTestContext(tokenQuota int) *gin.Context {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	ctx.Set("token_quota", tokenQuota)
	return ctx
}

func newBillingRelayInfo(userId int, tokenId int, tokenKey string, pref string, requestId string) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		UserId:          userId,
		TokenId:         tokenId,
		TokenKey:        tokenKey,
		OriginModelName: "gpt-4o-mini",
		RequestId:       requestId,
		UserSetting: dto.UserSetting{
			BillingPreference: pref,
		},
		StartTime: time.Now(),
	}
}

func getSubscriptionPreConsumeRecord(t *testing.T, requestId string) *model.SubscriptionPreConsumeRecord {
	t.Helper()
	var record model.SubscriptionPreConsumeRecord
	err := model.DB.Where("request_id = ?", requestId).First(&record).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil
		}
		require.NoError(t, err)
	}
	return &record
}

func TestPreConsumeBilling_SubscriptionFirst_UsesSubscriptionAndSettles(t *testing.T) {
	truncate(t)

	const userID = 101
	const tokenID = 201
	const subID = 301
	const planID = 401
	const userQuota = 9000
	const tokenQuota = 12000
	const preConsumed = 3000
	const actualQuota = 1000
	const subUsed int64 = 2000

	seedUser(t, userID, userQuota)
	seedToken(t, tokenID, userID, "sk-billing-sub-first", tokenQuota)
	seedSubscriptionPlan(t, planID, "Monthly", 20000)
	seedSubscriptionWithPlan(t, subID, userID, planID, 20000, subUsed)

	ctx := newBillingTestContext(tokenQuota)
	info := newBillingRelayInfo(userID, tokenID, "sk-billing-sub-first", "subscription_first", "req-billing-sub-first")

	apiErr := PreConsumeBilling(ctx, preConsumed, info)
	require.Nil(t, apiErr)
	require.NotNil(t, info.Billing)

	assert.Equal(t, BillingSourceSubscription, info.BillingSource)
	assert.Equal(t, preConsumed, info.FinalPreConsumedQuota)
	assert.Equal(t, subID, info.SubscriptionId)
	assert.Equal(t, planID, info.SubscriptionPlanId)
	assert.Equal(t, "Monthly", info.SubscriptionPlanTitle)
	assert.Equal(t, userQuota, getUserQuota(t, userID))
	assert.Equal(t, tokenQuota-preConsumed, getTokenRemainQuota(t, tokenID))
	assert.Equal(t, subUsed+int64(preConsumed), getSubscriptionUsed(t, subID))

	record := getSubscriptionPreConsumeRecord(t, info.RequestId)
	require.NotNil(t, record)
	assert.Equal(t, int64(preConsumed), record.PreConsumed)
	assert.Equal(t, "consumed", record.Status)

	require.NoError(t, SettleBilling(ctx, info, actualQuota))

	assert.Equal(t, tokenQuota-actualQuota, getTokenRemainQuota(t, tokenID))
	assert.Equal(t, subUsed+int64(actualQuota), getSubscriptionUsed(t, subID))
	assert.Equal(t, int64(actualQuota-preConsumed), info.SubscriptionPostDelta)
}

func TestPreConsumeBilling_SubscriptionFirst_FallsBackToWalletWhenSubscriptionInsufficient(t *testing.T) {
	truncate(t)

	const userID = 102
	const tokenID = 202
	const subID = 302
	const planID = 402
	const userQuota = 10000
	const tokenQuota = 11000
	const preConsumed = 2500
	const subUsed int64 = 1500

	seedUser(t, userID, userQuota)
	seedToken(t, tokenID, userID, "sk-billing-wallet-fallback", tokenQuota)
	seedSubscriptionPlan(t, planID, "Starter", 3000)
	seedSubscriptionWithPlan(t, subID, userID, planID, 3000, subUsed)

	ctx := newBillingTestContext(tokenQuota)
	info := newBillingRelayInfo(userID, tokenID, "sk-billing-wallet-fallback", "subscription_first", "req-billing-wallet-fallback")

	apiErr := PreConsumeBilling(ctx, preConsumed, info)
	require.Nil(t, apiErr)
	require.NotNil(t, info.Billing)

	assert.Equal(t, BillingSourceWallet, info.BillingSource)
	assert.Equal(t, preConsumed, info.FinalPreConsumedQuota)
	assert.Equal(t, 0, info.SubscriptionId)
	assert.Equal(t, userQuota-preConsumed, getUserQuota(t, userID))
	assert.Equal(t, tokenQuota-preConsumed, getTokenRemainQuota(t, tokenID))
	assert.Equal(t, subUsed, getSubscriptionUsed(t, subID))
	assert.Nil(t, getSubscriptionPreConsumeRecord(t, info.RequestId))
}

func TestPreConsumeBilling_WalletFirst_FallsBackToSubscriptionWhenWalletInsufficient(t *testing.T) {
	truncate(t)

	const userID = 103
	const tokenID = 203
	const subID = 303
	const planID = 403
	const userQuota = 800
	const tokenQuota = 9000
	const preConsumed = 2400
	const subUsed int64 = 1200

	seedUser(t, userID, userQuota)
	seedToken(t, tokenID, userID, "sk-billing-sub-fallback", tokenQuota)
	seedSubscriptionPlan(t, planID, "Pro", 10000)
	seedSubscriptionWithPlan(t, subID, userID, planID, 10000, subUsed)

	ctx := newBillingTestContext(tokenQuota)
	info := newBillingRelayInfo(userID, tokenID, "sk-billing-sub-fallback", "wallet_first", "req-billing-sub-fallback")

	apiErr := PreConsumeBilling(ctx, preConsumed, info)
	require.Nil(t, apiErr)
	require.NotNil(t, info.Billing)

	assert.Equal(t, BillingSourceSubscription, info.BillingSource)
	assert.Equal(t, preConsumed, info.FinalPreConsumedQuota)
	assert.Equal(t, subID, info.SubscriptionId)
	assert.Equal(t, userQuota, getUserQuota(t, userID))
	assert.Equal(t, tokenQuota-preConsumed, getTokenRemainQuota(t, tokenID))
	assert.Equal(t, subUsed+int64(preConsumed), getSubscriptionUsed(t, subID))

	record := getSubscriptionPreConsumeRecord(t, info.RequestId)
	require.NotNil(t, record)
	assert.Equal(t, "consumed", record.Status)
}

func TestBillingSessionRefund_SubscriptionRestoresQuota(t *testing.T) {
	truncate(t)

	const userID = 104
	const tokenID = 204
	const subID = 304
	const planID = 404
	const tokenQuota = 7000
	const preConsumed = 1800
	const subUsed int64 = 900

	seedUser(t, userID, 0)
	seedToken(t, tokenID, userID, "sk-billing-sub-refund", tokenQuota)
	seedSubscriptionPlan(t, planID, "Refundable", 9000)
	seedSubscriptionWithPlan(t, subID, userID, planID, 9000, subUsed)

	ctx := newBillingTestContext(tokenQuota)
	info := newBillingRelayInfo(userID, tokenID, "sk-billing-sub-refund", "subscription_only", "req-billing-sub-refund")

	apiErr := PreConsumeBilling(ctx, preConsumed, info)
	require.Nil(t, apiErr)

	session, ok := info.Billing.(*BillingSession)
	require.True(t, ok)
	require.True(t, session.NeedsRefund())

	session.Refund(ctx)
	session.Refund(ctx)

	require.Eventually(t, func() bool {
		record := getSubscriptionPreConsumeRecord(t, info.RequestId)
		if record == nil {
			return false
		}
		return record.Status == "refunded" &&
			getTokenRemainQuota(t, tokenID) == tokenQuota &&
			getSubscriptionUsed(t, subID) == subUsed
	}, time.Second, 20*time.Millisecond)

	require.False(t, session.NeedsRefund())
}
