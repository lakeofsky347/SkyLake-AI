package controller

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay"
	"github.com/QuantumNous/new-api/relay/channel/ai360"
	"github.com/QuantumNous/new-api/relay/channel/lingyiwanwu"
	"github.com/QuantumNous/new-api/relay/channel/minimax"
	"github.com/QuantumNous/new-api/relay/channel/moonshot"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

// https://platform.openai.com/docs/api-reference/models/list

var openAIModels []dto.OpenAIModels
var openAIModelsMap map[string]dto.OpenAIModels
var channelId2Models map[int][]string

func init() {
	// https://platform.openai.com/docs/models/model-endpoint-compatibility
	for i := 0; i < constant.APITypeDummy; i++ {
		if i == constant.APITypeAIProxyLibrary {
			continue
		}
		adaptor := relay.GetAdaptor(i)
		channelName := adaptor.GetChannelName()
		modelNames := adaptor.GetModelList()
		for _, modelName := range modelNames {
			openAIModels = append(openAIModels, dto.OpenAIModels{
				Id:      modelName,
				Object:  "model",
				Created: 1626777600,
				OwnedBy: channelName,
			})
		}
	}
	for _, modelName := range ai360.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:      modelName,
			Object:  "model",
			Created: 1626777600,
			OwnedBy: ai360.ChannelName,
		})
	}
	for _, modelName := range moonshot.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:      modelName,
			Object:  "model",
			Created: 1626777600,
			OwnedBy: moonshot.ChannelName,
		})
	}
	for _, modelName := range lingyiwanwu.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:      modelName,
			Object:  "model",
			Created: 1626777600,
			OwnedBy: lingyiwanwu.ChannelName,
		})
	}
	for _, modelName := range minimax.ModelList {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:      modelName,
			Object:  "model",
			Created: 1626777600,
			OwnedBy: minimax.ChannelName,
		})
	}
	for modelName, _ := range constant.MidjourneyModel2Action {
		openAIModels = append(openAIModels, dto.OpenAIModels{
			Id:      modelName,
			Object:  "model",
			Created: 1626777600,
			OwnedBy: "midjourney",
		})
	}
	openAIModelsMap = make(map[string]dto.OpenAIModels)
	for _, aiModel := range openAIModels {
		openAIModelsMap[aiModel.Id] = aiModel
	}
	channelId2Models = make(map[int][]string)
	for i := 1; i <= constant.ChannelTypeDummy; i++ {
		apiType, success := common.ChannelType2APIType(i)
		if !success || apiType == constant.APITypeAIProxyLibrary {
			continue
		}
		meta := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType: i,
		}}
		adaptor := relay.GetAdaptor(apiType)
		adaptor.Init(meta)
		channelId2Models[i] = adaptor.GetModelList()
	}
	openAIModels = lo.UniqBy(openAIModels, func(m dto.OpenAIModels) string {
		return m.Id
	})
}

func channelOwnerName(channelType int) string {
	apiType, success := common.ChannelType2APIType(channelType)
	if !success {
		return strings.ToLower(constant.GetChannelTypeName(channelType))
	}
	adaptor := relay.GetAdaptor(apiType)
	if adaptor == nil {
		return strings.ToLower(constant.GetChannelTypeName(channelType))
	}
	adaptor.Init(&relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{
		ChannelType: channelType,
	}})
	if name := strings.TrimSpace(adaptor.GetChannelName()); name != "" {
		return name
	}
	return strings.ToLower(constant.GetChannelTypeName(channelType))
}

func getPreferredModelOwners(modelNames []string, groups []string) map[string]string {
	channelTypes, err := model.GetPreferredModelOwnerChannelTypes(modelNames, groups)
	if err != nil {
		common.SysLog(fmt.Sprintf("GetPreferredModelOwnerChannelTypes error: %v", err))
		return map[string]string{}
	}

	ownerByChannelType := make(map[int]string)
	owners := make(map[string]string, len(channelTypes))
	for modelName, channelType := range channelTypes {
		owner, ok := ownerByChannelType[channelType]
		if !ok {
			owner = channelOwnerName(channelType)
			ownerByChannelType[channelType] = owner
		}
		if owner != "" {
			owners[modelName] = owner
		}
	}
	return owners
}

func buildOpenAIModel(modelName string, ownerByModel map[string]string) dto.OpenAIModels {
	var oaiModel dto.OpenAIModels
	if staticModel, ok := openAIModelsMap[modelName]; ok {
		oaiModel = staticModel
	} else {
		oaiModel = dto.OpenAIModels{
			Id:      modelName,
			Object:  "model",
			Created: 1626777600,
			OwnedBy: "custom",
		}
	}
	if owner, ok := ownerByModel[modelName]; ok && owner != "" {
		oaiModel.OwnedBy = owner
	}
	oaiModel.SupportedEndpointTypes = model.GetModelSupportEndpointTypes(modelName)
	return oaiModel
}

type modelListGroups struct {
	userGroup   string
	tokenGroup  string
	ownerGroups []string
}

type userModelOption struct {
	Label                  string                  `json:"label"`
	Value                  string                  `json:"value"`
	Category               string                  `json:"category,omitempty"`
	Description            string                  `json:"description,omitempty"`
	SupportedEndpointTypes []constant.EndpointType `json:"supported_endpoint_types,omitempty"`
}

func getModelListGroups(c *gin.Context) (modelListGroups, error) {
	tokenGroup := common.GetContextKeyString(c, constant.ContextKeyTokenGroup)
	userGroup := common.GetContextKeyString(c, constant.ContextKeyUserGroup)
	if userGroup == "" && (tokenGroup == "" || tokenGroup == "auto") {
		userId := c.GetInt("id")
		if userId > 0 {
			var err error
			userGroup, err = model.GetUserGroup(userId, false)
			if err != nil {
				return modelListGroups{}, err
			}
		}
	}

	if tokenGroup == "auto" {
		return modelListGroups{
			userGroup:   userGroup,
			tokenGroup:  tokenGroup,
			ownerGroups: service.GetUserAutoGroup(userGroup),
		}, nil
	}

	group := userGroup
	if tokenGroup != "" {
		group = tokenGroup
	}
	return modelListGroups{
		userGroup:   userGroup,
		tokenGroup:  tokenGroup,
		ownerGroups: []string{group},
	}, nil
}

func getModelListGroupsForSelectedGroup(userGroup string, selectedGroup string) (modelListGroups, error) {
	selectedGroup = strings.TrimSpace(selectedGroup)
	if selectedGroup == "" {
		usableGroups := service.GetUserUsableGroups(userGroup)
		ownerGroups := make([]string, 0, len(usableGroups))
		for groupName := range usableGroups {
			if groupName == "auto" {
				continue
			}
			ownerGroups = append(ownerGroups, groupName)
		}
		sort.Strings(ownerGroups)
		return modelListGroups{
			userGroup:   userGroup,
			ownerGroups: ownerGroups,
		}, nil
	}

	if !service.GroupInUserUsableGroups(userGroup, selectedGroup) {
		return modelListGroups{}, fmt.Errorf("group %s is not available for the current user", selectedGroup)
	}

	if selectedGroup == "auto" {
		return modelListGroups{
			userGroup:   userGroup,
			tokenGroup:  selectedGroup,
			ownerGroups: service.GetUserAutoGroup(userGroup),
		}, nil
	}

	return modelListGroups{
		userGroup:   userGroup,
		tokenGroup:  selectedGroup,
		ownerGroups: []string{selectedGroup},
	}, nil
}

func shouldAcceptUnsetRatioModel(c *gin.Context) bool {
	acceptUnsetRatioModel := operation_setting.SelfUseModeEnabled
	if acceptUnsetRatioModel {
		return true
	}

	userId := c.GetInt("id")
	if userId <= 0 {
		return false
	}

	userSettings, err := model.GetUserSetting(userId, false)
	if err != nil {
		return false
	}
	return userSettings.AcceptUnsetRatioModel
}

func collectUserModelNames(groups modelListGroups, acceptUnsetRatioModel bool, modelLimit map[string]bool) []string {
	modelSet := make(map[string]struct{})
	modelNames := make([]string, 0)
	appendModel := func(modelName string) {
		if _, exists := modelSet[modelName]; exists {
			return
		}
		if !acceptUnsetRatioModel && !helper.HasModelBillingConfig(modelName) {
			return
		}
		modelSet[modelName] = struct{}{}
		modelNames = append(modelNames, modelName)
	}

	if len(modelLimit) > 0 {
		for allowModel := range modelLimit {
			appendModel(allowModel)
		}
		sort.Strings(modelNames)
		return modelNames
	}

	for _, ownerGroup := range groups.ownerGroups {
		for _, modelName := range model.GetGroupEnabledModels(ownerGroup) {
			appendModel(modelName)
		}
	}
	sort.Strings(modelNames)
	return modelNames
}

func listModelsForGroups(c *gin.Context, modelType int, groups modelListGroups, modelLimit map[string]bool) ([]string, []dto.OpenAIModels, error) {
	modelNames := collectUserModelNames(groups, shouldAcceptUnsetRatioModel(c), modelLimit)
	ownerByModel := map[string]string{}
	if len(groups.ownerGroups) > 0 {
		ownerByModel = getPreferredModelOwners(modelNames, groups.ownerGroups)
	}

	openAIResult := make([]dto.OpenAIModels, 0, len(modelNames))
	for _, modelName := range modelNames {
		openAIResult = append(openAIResult, buildOpenAIModel(modelName, ownerByModel))
	}
	return modelNames, openAIResult, nil
}

func modelCategoryFromTags(tags string) string {
	for _, rawTag := range strings.Split(tags, ",") {
		tag := strings.TrimSpace(rawTag)
		if tag == "" {
			continue
		}
		lowerTag := strings.ToLower(tag)
		switch {
		case strings.HasPrefix(lowerTag, "category:"):
			return strings.TrimSpace(tag[len("category:"):])
		case strings.HasPrefix(lowerTag, "category="):
			return strings.TrimSpace(tag[len("category="):])
		case strings.HasPrefix(lowerTag, "group_tag:"):
			return strings.TrimSpace(tag[len("group_tag:"):])
		case strings.HasPrefix(lowerTag, "group_tag="):
			return strings.TrimSpace(tag[len("group_tag="):])
		}
	}
	return ""
}

func inferUserModelCategory(modelName string, item *model.Model, endpoints []constant.EndpointType) string {
	if item != nil {
		if category := modelCategoryFromTags(item.Tags); category != "" {
			return category
		}
	}

	endpointSet := make(map[constant.EndpointType]struct{}, len(endpoints))
	for _, endpoint := range endpoints {
		endpointSet[endpoint] = struct{}{}
	}

	switch {
	case hasEndpoint(endpointSet, constant.EndpointTypeImageGeneration):
		return "Image"
	case hasEndpoint(endpointSet, constant.EndpointTypeOpenAIVideo):
		return "Video"
	case hasEndpoint(endpointSet, constant.EndpointTypeEmbeddings):
		return "Embeddings"
	case hasEndpoint(endpointSet, constant.EndpointTypeJinaRerank):
		return "Rerank"
	}

	lowerName := strings.ToLower(modelName)
	switch {
	case strings.Contains(lowerName, "whisper"),
		strings.Contains(lowerName, "tts"),
		strings.Contains(lowerName, "stt"),
		strings.Contains(lowerName, "audio"),
		strings.Contains(lowerName, "speech"):
		return "Audio"
	case strings.Contains(lowerName, "reason"),
		strings.HasPrefix(lowerName, "o1"),
		strings.HasPrefix(lowerName, "o3"),
		strings.HasPrefix(lowerName, "o4"),
		strings.Contains(lowerName, "thinking"),
		strings.Contains(lowerName, "r1"):
		return "Reasoning"
	case strings.Contains(lowerName, "long"),
		strings.Contains(lowerName, "context"),
		strings.Contains(lowerName, "128k"),
		strings.Contains(lowerName, "200k"),
		strings.Contains(lowerName, "1m"):
		return "Long Context"
	default:
		return "General Chat"
	}
}

func hasEndpoint(endpoints map[constant.EndpointType]struct{}, endpoint constant.EndpointType) bool {
	_, ok := endpoints[endpoint]
	return ok
}

func buildUserModelOptions(openAIModels []dto.OpenAIModels) []userModelOption {
	modelNames := make([]string, 0, len(openAIModels))
	for _, item := range openAIModels {
		modelNames = append(modelNames, item.Id)
	}
	modelMeta, err := model.GetModelsByNames(modelNames)
	if err != nil {
		common.SysLog(fmt.Sprintf("GetModelsByNames error: %v", err))
		modelMeta = map[string]*model.Model{}
	}

	options := make([]userModelOption, 0, len(openAIModels))
	for _, item := range openAIModels {
		meta := modelMeta[item.Id]
		description := ""
		if meta != nil {
			description = strings.TrimSpace(meta.Description)
		}
		options = append(options, userModelOption{
			Label:                  item.Id,
			Value:                  item.Id,
			Category:               inferUserModelCategory(item.Id, meta, item.SupportedEndpointTypes),
			Description:            description,
			SupportedEndpointTypes: item.SupportedEndpointTypes,
		})
	}
	return options
}

func ListModels(c *gin.Context, modelType int) {
	groups, err := getModelListGroups(c)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "get user group failed",
		})
		return
	}
	modelLimitEnable := common.GetContextKeyBool(c, constant.ContextKeyTokenModelLimitEnabled)
	modelLimit := map[string]bool{}
	if modelLimitEnable {
		s, ok := common.GetContextKey(c, constant.ContextKeyTokenModelLimit)
		if ok {
			modelLimit = s.(map[string]bool)
		}
	}

	_, userOpenAiModels, err := listModelsForGroups(c, modelType, groups, modelLimit)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	switch modelType {
	case constant.ChannelTypeAnthropic:
		useranthropicModels := make([]dto.AnthropicModel, len(userOpenAiModels))
		for i, model := range userOpenAiModels {
			useranthropicModels[i] = dto.AnthropicModel{
				ID:          model.Id,
				CreatedAt:   time.Unix(int64(model.Created), 0).UTC().Format(time.RFC3339),
				DisplayName: model.Id,
				Type:        "model",
			}
		}
		c.JSON(200, gin.H{
			"data":     useranthropicModels,
			"first_id": useranthropicModels[0].ID,
			"has_more": false,
			"last_id":  useranthropicModels[len(useranthropicModels)-1].ID,
		})
	case constant.ChannelTypeGemini:
		userGeminiModels := make([]dto.GeminiModel, len(userOpenAiModels))
		for i, model := range userOpenAiModels {
			userGeminiModels[i] = dto.GeminiModel{
				Name:        model.Id,
				DisplayName: model.Id,
			}
		}
		c.JSON(200, gin.H{
			"models":        userGeminiModels,
			"nextPageToken": nil,
		})
	default:
		c.JSON(200, gin.H{
			"success": true,
			"data":    userOpenAiModels,
			"object":  "list",
		})
	}
}

func ChannelListModels(c *gin.Context) {
	c.JSON(200, gin.H{
		"success": true,
		"data":    openAIModels,
	})
}

func DashboardListModels(c *gin.Context) {
	c.JSON(200, gin.H{
		"success": true,
		"data":    channelId2Models,
	})
}

func EnabledListModels(c *gin.Context) {
	c.JSON(200, gin.H{
		"success": true,
		"data":    model.GetEnabledModels(),
	})
}

func RetrieveModel(c *gin.Context, modelType int) {
	modelId := c.Param("model")
	if aiModel, ok := openAIModelsMap[modelId]; ok {
		switch modelType {
		case constant.ChannelTypeAnthropic:
			c.JSON(200, dto.AnthropicModel{
				ID:          aiModel.Id,
				CreatedAt:   time.Unix(int64(aiModel.Created), 0).UTC().Format(time.RFC3339),
				DisplayName: aiModel.Id,
				Type:        "model",
			})
		default:
			c.JSON(200, aiModel)
		}
	} else {
		openAIError := types.OpenAIError{
			Message: fmt.Sprintf("The model '%s' does not exist", modelId),
			Type:    "invalid_request_error",
			Param:   "model",
			Code:    "model_not_found",
		}
		c.JSON(200, gin.H{
			"error": openAIError,
		})
	}
}
