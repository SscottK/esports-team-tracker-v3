from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orgs.models import OrgJoinCode, OrgMembership, Organization, generate_join_code
from orgs.serializers import (
    CreateOrganizationSerializer,
    LeaveOrgSerializer,
    OrgJoinRequestSerializer,
    OrgMembershipSerializer,
    OrganizationSerializer,
    RequestOrgJoinSerializer,
    ReviewOrgJoinRequestSerializer,
    UpdateOrgMembershipSerializer,
)
from orgs.services.join_requests import (
    OrgJoinRequestError,
    cancel_org_join_request,
    create_org_join_request,
    review_org_join_request,
)
from orgs.services.membership import LeaveOrgError, ensure_org_has_leader, leave_org
from orgs.models import OrgJoinRequest, OrgJoinRequestStatus


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Organization.objects.filter(
            memberships__user=self.request.user,
        ).distinct()


def build_org_payload(membership):
    org = membership.organization
    payload = OrganizationSerializer(org).data
    payload['membership_id'] = membership.id
    payload['is_org_leader'] = membership.is_admin
    payload['is_admin'] = membership.is_admin
    payload['join_code'] = (
        getattr(org.join_code, 'code', None)
        if membership.is_admin
        else None
    )
    return payload


class OrganizationActionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        memberships = (
            OrgMembership.objects.select_related('organization', 'organization__join_code')
            .filter(user=request.user)
            .order_by('organization__name')
        )
        return Response({
            'organizations': [build_org_payload(membership) for membership in memberships],
        })

    def post(self, request):
        serializer = CreateOrganizationSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()
        membership = OrgMembership.objects.get(user=request.user, organization=organization)
        return Response(build_org_payload(membership), status=status.HTTP_201_CREATED)


class JoinOrganizationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RequestOrgJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            join_request = create_org_join_request(request.user, serializer.validated_data['code'])
        except OrgJoinRequestError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)
        return Response(
            OrgJoinRequestSerializer(join_request).data,
            status=status.HTTP_201_CREATED,
        )


class MyOrgJoinRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        join_requests = OrgJoinRequest.objects.filter(
            user=request.user,
            status=OrgJoinRequestStatus.PENDING,
        ).select_related('organization')
        return Response(OrgJoinRequestSerializer(join_requests, many=True).data)


class OrgJoinRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, org_id):
        if not OrgMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_admin=True,
        ).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)
        join_requests = OrgJoinRequest.objects.filter(
            organization_id=org_id,
            status=OrgJoinRequestStatus.PENDING,
        ).select_related('user')
        return Response(OrgJoinRequestSerializer(join_requests, many=True).data)


class OrgJoinRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, org_id, request_id):
        serializer = ReviewOrgJoinRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']

        if action == 'cancel':
            try:
                join_request = cancel_org_join_request(request.user, request_id, org_id)
            except OrgJoinRequestError as exc:
                return Response({'detail': exc.message}, status=exc.status_code)
            return Response(OrgJoinRequestSerializer(join_request).data)

        try:
            join_request, membership = review_org_join_request(
                request.user,
                request_id,
                org_id,
                action=action,
            )
        except OrgJoinRequestError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        response = OrgJoinRequestSerializer(join_request).data
        if membership:
            response['membership'] = OrgMembershipSerializer(membership).data
        return Response(response)


class OrgMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, org_id):
        if not OrgMembership.objects.filter(user=request.user, organization_id=org_id).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)
        memberships = OrgMembership.objects.filter(organization_id=org_id).select_related('user')
        return Response(OrgMembershipSerializer(memberships, many=True).data)

    def post(self, request, org_id):
        membership = OrgMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_admin=True,
        ).first()
        if not membership:
            return Response(
                {'detail': 'Only organization leaders can regenerate the join code.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        join_code, _ = OrgJoinCode.objects.get_or_create(organization_id=org_id)
        join_code.code = generate_join_code()
        join_code.save()
        return Response({'join_code': join_code.code})


class OrgMembershipDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, org_id, membership_id):
        actor = OrgMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_admin=True,
        ).first()
        if not actor:
            return Response(
                {'detail': 'Only organization leaders can update org roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = OrgMembership.objects.filter(pk=membership_id, organization_id=org_id).first()
        if not membership:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrgMembershipSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if 'is_org_leader' in serializer.validated_data:
            new_leader_status = serializer.validated_data['is_org_leader']
            if membership.is_admin and not new_leader_status:
                try:
                    ensure_org_has_leader(org_id, exclude_membership_id=membership.pk)
                except LeaveOrgError as exc:
                    return Response({'detail': exc.message}, status=exc.status_code)
            membership.is_admin = new_leader_status
            membership.save(update_fields=['is_admin'])

        return Response(OrgMembershipSerializer(membership).data)


class OrgLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, org_id):
        if not OrgMembership.objects.filter(user=request.user, organization_id=org_id).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = LeaveOrgSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = leave_org(
                request.user,
                org_id,
                successor_membership_id=serializer.validated_data.get('successor_membership_id'),
                disband=serializer.validated_data.get('disband', False),
            )
        except LeaveOrgError as exc:
            return Response({'detail': exc.message}, status=exc.status_code)

        return Response(result)
