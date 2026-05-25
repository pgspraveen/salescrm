# urls.py = maps URL patterns to view functions
# path('customers/', views.customer_list) means:
#   GET  /api/customers/ -> customer_list (returns list)
#   POST /api/customers/ -> customer_list (creates new)

from django.urls import path
from . import views

urlpatterns = [
    # auth - no token required
    path('register/', views.register,   name='register'),
    path('login/',    views.login_view, name='login'),

    # customers - token required
    path('customers/',          views.customer_list,   name='customer-list'),
    path('customers/<int:pk>/', views.customer_detail, name='customer-detail'),

    # deals - token required
    path('deals/',          views.deal_list,   name='deal-list'),
    path('deals/<int:pk>/', views.deal_detail, name='deal-detail'),

    # activities - token required
    path('activities/',          views.activity_list,   name='activity-list'),
    path('activities/<int:pk>/', views.activity_detail, name='activity-detail'),

    # ai endpoints - token required
    # <int:deal_id> = captures number from URL e.g. /ai/deal/3/predict/
    path('ai/deal/<int:deal_id>/predict/',       views.ai_deal_predict,  name='ai-deal-predict'),
    path('ai/customer/<int:customer_id>/churn/', views.ai_churn_predict, name='ai-churn'),
    path('ai/sales-insights/',                   views.ai_sales_insights, name='ai-insights'),
]