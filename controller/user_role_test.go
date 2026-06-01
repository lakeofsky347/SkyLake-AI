package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestCanManageTargetRole_RootIsHighestRole(t *testing.T) {
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
			name:       "admin cannot manage admin user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleAdminUser,
			want:       false,
		},
		{
			name:       "admin cannot manage root user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleRootUser,
			want:       false,
		},
		{
			name:       "root user manages admin user",
			myRole:     common.RoleRootUser,
			targetRole: common.RoleAdminUser,
			want:       true,
		},
		{
			name:       "root user manages root user",
			myRole:     common.RoleRootUser,
			targetRole: common.RoleRootUser,
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

func TestCanAssignTargetRole_RootOnlyAssignsElevatedRoles(t *testing.T) {
	tests := []struct {
		name       string
		myRole     int
		targetRole int
		want       bool
	}{
		{
			name:       "admin assigns common user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleCommonUser,
			want:       true,
		},
		{
			name:       "admin cannot assign admin user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleAdminUser,
			want:       false,
		},
		{
			name:       "admin cannot assign root user",
			myRole:     common.RoleAdminUser,
			targetRole: common.RoleRootUser,
			want:       false,
		},
		{
			name:       "root assigns admin user",
			myRole:     common.RoleRootUser,
			targetRole: common.RoleAdminUser,
			want:       true,
		},
		{
			name:       "root assigns root user",
			myRole:     common.RoleRootUser,
			targetRole: common.RoleRootUser,
			want:       true,
		},
		{
			name:       "common user cannot assign common user",
			myRole:     common.RoleCommonUser,
			targetRole: common.RoleCommonUser,
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := canAssignTargetRole(tt.myRole, tt.targetRole); got != tt.want {
				t.Fatalf("canAssignTargetRole(%d, %d) = %v, want %v", tt.myRole, tt.targetRole, got, tt.want)
			}
		})
	}
}
