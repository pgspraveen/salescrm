# views.py = handles HTTP requests and returns responses
# Each function = one API endpoint
# @api_view = tells Django REST Framework which HTTP methods are allowed
# @permission_classes = controls who can access the endpoint

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Customer, Deal, Activity
from .serializers import CustomerSerializer, DealSerializer, ActivitySerializer
from .ai_engine import predict_deal_outcome, predict_customer_churn, get_sales_insights


# --- AUTH VIEWS ---
# AllowAny = no token needed (public endpoint)
# Anyone can register or login

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    # request.data = JSON body sent from React frontend
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email    = request.data.get('email', '').strip()

    if not username or not password:
        return Response({'error': 'Username and password are required'}, status=400)

    # filter().exists() = efficient way to check if record exists
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already taken'}, status=400)

    # create_user() = hashes password before saving (never store plain text passwords)
    user = User.objects.create_user(username=username, password=password, email=email)

    # fail_silently=True = app won't crash if email sending fails
    if email:
       try:
         print("EMAIL USER =", settings.EMAIL_HOST_USER)
         print("REGISTER EMAIL =", email)
         print("EMAIL PASSWORD EXISTS =", bool(settings.EMAIL_HOST_PASSWORD))

         send_mail(
            subject='Welcome to SalesPulse CRM!',
            message=f'''Hi {username},

Registration successful!

Welcome to SalesPulse CRM 🚀

You can now login and manage customers, deals and activities.
''',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            fail_silently=False,
            
        )

         print("EMAIL SENT SUCCESSFULLY")

       except Exception as e:
        print("EMAIL ERROR =", repr(e))

    # RefreshToken = generates JWT token pair (access + refresh)
    # access token = short-lived (24hrs), sent with every request
    refresh = RefreshToken.for_user(user)
    return Response({
        'message':  'Account created successfully!',
        'token':    str(refresh.access_token),  # send token immediately after register
        'username': user.username,
    }, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()

    # authenticate() = checks username/password against DB, returns user or None
    user = authenticate(username=username, password=password)

    if user is None:
        return Response({'error': 'Invalid username or password'}, status=401)

    refresh = RefreshToken.for_user(user)
    return Response({
        'token':    str(refresh.access_token),
        'username': user.username,
        'email':    user.email,
    })


# --- CUSTOMER VIEWS ---
# IsAuthenticated = request must include valid JWT token in Authorization header

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def customer_list(request):
    if request.method == 'GET':
        customers = Customer.objects.all()

        # query_params = URL parameters e.g. /api/customers/?search=ravi
        search = request.query_params.get('search', '').strip()
        if search:
            # icontains = case-insensitive SQL LIKE search
            # | = OR operator to search both name and company
            customers = customers.filter(name__icontains=search) | \
                        customers.filter(company__icontains=search)

        # many=True = serialize a list of objects (not just one)
        return Response(CustomerSerializer(customers, many=True).data)

    elif request.method == 'POST':
        # is_valid() = validates required fields, data types, unique constraints
        serializer = CustomerSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()   # save() = INSERT into SQL Server
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def customer_detail(request, pk):
    # pk = primary key from URL e.g. /api/customers/3/
    try:
        customer = Customer.objects.get(pk=pk)
    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=404)

    if request.method == 'GET':
        return Response(CustomerSerializer(customer).data)

    elif request.method == 'PUT':
        # passing instance = UPDATE existing record (not create new)
        serializer = CustomerSerializer(customer, data=request.data)
        if serializer.is_valid():
            serializer.save()   # save() = UPDATE in SQL Server
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    elif request.method == 'DELETE':
        customer.delete()   # DELETE FROM crm_customers WHERE id=pk
        return Response(status=204)     # 204 = success but no content to return


# --- DEAL VIEWS ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def deal_list(request):
    if request.method == 'GET':
        # select_related = SQL JOIN, fetches customer in same query (avoids N+1 problem)
        deals = Deal.objects.select_related('customer').all()

        stage = request.query_params.get('stage', '').strip()
        if stage:
            deals = deals.filter(stage=stage)   # exact match filter

        return Response(DealSerializer(deals, many=True).data)

    elif request.method == 'POST':
        serializer = DealSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def deal_detail(request, pk):
    try:
        deal = Deal.objects.select_related('customer').get(pk=pk)
    except Deal.DoesNotExist:
        return Response({'error': 'Deal not found'}, status=404)

    if request.method == 'GET':
        return Response(DealSerializer(deal).data)

    elif request.method == 'PUT':
        old_stage  = deal.stage     # save old stage before update

        serializer = DealSerializer(deal, data=request.data)
        if serializer.is_valid():
            serializer.save()
            new_stage = serializer.data['stage']

            # send email only when stage changes TO closed_won or closed_lost
            stage_changed = old_stage != new_stage
            is_closed     = new_stage in ['closed_won', 'closed_lost']

            if stage_changed and is_closed and request.user.email:
                is_won = new_stage == 'closed_won'
                send_mail(
                    subject=f"Deal {'WON' if is_won else 'LOST'}: {deal.title}",
                    message=(
                        f"Hi {request.user.username},\n\n"
                        f"Deal: {deal.title}\n"
                        f"Customer: {deal.customer.name}\n"
                        f"Value: ${deal.value:,.2f}\n"
                        f"Status: {'CLOSED WON' if is_won else 'CLOSED LOST'}\n\n"
                        f"Login: http://localhost:5173"
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[request.user.email],
                    fail_silently=True,
                )
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    elif request.method == 'DELETE':
        deal.delete()
        return Response(status=204)


# --- ACTIVITY VIEWS ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def activity_list(request):
    if request.method == 'GET':
        # select_related with multiple = joins both customer and deal tables
        activities = Activity.objects.select_related('customer', 'deal').all()

        # filter by customer or deal if provided in URL params
        customer_id = request.query_params.get('customer', '').strip()
        deal_id     = request.query_params.get('deal', '').strip()

        if customer_id:
            activities = activities.filter(customer_id=customer_id)
        if deal_id:
            activities = activities.filter(deal_id=deal_id)

        return Response(ActivitySerializer(activities, many=True).data)

    elif request.method == 'POST':
        serializer = ActivitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def activity_detail(request, pk):
    try:
        activity = Activity.objects.get(pk=pk)
    except Activity.DoesNotExist:
        return Response({'error': 'Activity not found'}, status=404)

    if request.method == 'GET':
        return Response(ActivitySerializer(activity).data)
    elif request.method == 'DELETE':
        activity.delete()
        return Response(status=204)


# --- AI VIEWS ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_deal_predict(request, deal_id):
    # deal_id comes from URL: /api/ai/deal/3/predict/
    try:
        result = predict_deal_outcome(deal_id)
        return Response(result)
    except Deal.DoesNotExist:
        return Response({'error': 'Deal not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_churn_predict(request, customer_id):
    try:
        result = predict_customer_churn(customer_id)
        return Response(result)
    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_sales_insights(request):
    # days param from URL: /api/ai/sales-insights/?days=30
    days = int(request.query_params.get('days', 30))
    try:
        result = get_sales_insights(days)
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=500)