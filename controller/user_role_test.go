package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestCanManageTargetRole_AdminIsHighestRole(t *testing.T) {
	tests := []struct {
		name       string
		myRole     int
		targetRole int
		want       bool
	}{
		{
			name:       "admin manages common user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleCommonUser,
			want:       true,
		},
		{
			name:       "admin manages admin user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleAdminUser,
			want:       true,
		},
		{
			name:       "admin manages legacy root user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleLegacyRootUser,
			want:       true,
		},
		{
			name:       "legacy root user keeps admin compatibility",
			myRole:     common.RoleLegacyRootUser,
			targetRole: common.RoleAdminUser,
			want:       true,
		},
		{
			name:       "common user cannot manage common user",
			myRole:     common.RoleCommonUser,
			targetRole: common.RoleCommonUser,
			want:       false,
		},
		{
			name:       "common user cannot manage guest user",
			myRole:     common.RoleCommonUser,
			targetRole: common.RoleGuestUser,
			want:       false,
		},
		{
			name:       "common user cannot manage admin user",
			myRole:     common.RoleCommonUser,
			targetRole: common.RoleAdminUser,
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := canManageTargetRole(tt.myRole, tt.targetRole); got != tt.want {
				t.Fatalf("canManageTargetRole(%d, %d) = %v, want %v", tt.myRole, tt.targetRole, got, tt.want)
			}
		})
	}
}
