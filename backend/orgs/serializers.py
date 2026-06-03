from rest_framework import serializers

from orgs.models import Organization, OrgJoinCode, OrgJoinRequest, OrgMembership


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'created_at']


class OrgMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    is_org_leader = serializers.BooleanField(source='is_admin', read_only=True)

    class Meta:
        model = OrgMembership
        fields = ['id', 'user_id', 'username', 'is_admin', 'is_org_leader', 'joined_at']


class UpdateOrgMembershipSerializer(serializers.Serializer):
    is_org_leader = serializers.BooleanField()


class LeaveOrgSerializer(serializers.Serializer):
    successor_membership_id = serializers.IntegerField(required=False)
    disband = serializers.BooleanField(default=False)


class CreateOrganizationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)

    def create(self, validated_data):
        user = self.context['request'].user
        organization = Organization.objects.create(name=validated_data['name'])
        OrgMembership.objects.create(
            user=user,
            organization=organization,
            is_admin=True,
        )
        OrgJoinCode.objects.create(organization=organization)
        return organization


class RequestOrgJoinSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)

    def validate_code(self, value):
        if not OrgJoinCode.objects.filter(code__iexact=value.strip()).exists():
            raise serializers.ValidationError('Invalid join code.')
        return value.strip().upper()


class OrgJoinRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = OrgJoinRequest
        fields = [
            'id',
            'user_id',
            'username',
            'organization',
            'organization_name',
            'status',
            'reviewed_by',
            'created_at',
            'updated_at',
        ]


class ReviewOrgJoinRequestSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=('approve', 'reject', 'cancel'))
