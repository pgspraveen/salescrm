# serializers.py = converts Python objects <-> JSON
# When Django saves data: JSON (from React) -> serializer -> Python object -> SQL Server
# When Django reads data: SQL Server -> Python object -> serializer -> JSON (to React)

from rest_framework import serializers
from .models import Customer, Deal, Activity


class ActivitySerializer(serializers.ModelSerializer):
    # SerializerMethodField = computed field, not stored in DB
    # source='get_activity_type_display' = Django auto-generates this method from choices
    # e.g. 'call' stored in DB, but 'Phone Call' returned to frontend
    activity_type_display = serializers.CharField(
        source='get_activity_type_display',
        read_only=True      # read_only = returned in response but not required in request
    )

    class Meta:
        model  = Activity
        fields = '__all__'  # include every column from the table


class DealSerializer(serializers.ModelSerializer):
    # customer.name = traverse ForeignKey to get customer's name
    customer_name = serializers.CharField(
        source='customer.name',
        read_only=True
    )

    # get_stage_display() = 'closed_won' becomes 'Closed Won'
    stage_display = serializers.CharField(
        source='get_stage_display',
        read_only=True
    )

    class Meta:
        model  = Deal
        fields = '__all__'


class CustomerSerializer(serializers.ModelSerializer):
    industry_display = serializers.CharField(
        source='get_industry_display',
        read_only=True
    )

    # deals.count() = counts related deals using related_name='deals' from ForeignKey
    total_deals = serializers.IntegerField(
        source='deals.count',
        read_only=True
    )

    # SerializerMethodField = custom method below calculates the value
    total_revenue = serializers.SerializerMethodField()

    def get_total_revenue(self, obj):
        # obj = the current Customer instance
        # aggregate(Sum) = SQL SUM() function on deal values
        from django.db.models import Sum
        result = obj.deals.filter(stage='closed_won').aggregate(total=Sum('value'))
        return float(result['total'] or 0)

    class Meta:
        model  = Customer
        fields = '__all__'