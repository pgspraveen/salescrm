# models.py = defines database tables
# Django reads these classes and creates SQL Server tables automatically
# Each class = one table, each field = one column

from django.db import models


class Customer(models.Model):
    # INDUSTRY_CHOICES = dropdown options stored as short codes in DB
    # ('tech', 'Technology') = ('stored_value', 'display_label')
    INDUSTRY_CHOICES = [
        ('tech',          'Technology'),
        ('finance',       'Finance'),
        ('healthcare',    'Healthcare'),
        ('retail',        'Retail'),
        ('manufacturing', 'Manufacturing'),
        ('other',         'Other'),
    ]

    name    = models.CharField(max_length=200)      # VARCHAR(200) in SQL
    email   = models.EmailField(unique=True)         # unique=True adds UNIQUE constraint
    phone   = models.CharField(max_length=20, blank=True)   # blank=True = optional field
    company = models.CharField(max_length=200)

    industry       = models.CharField(max_length=50, choices=INDUSTRY_CHOICES, default='other')
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)  # DECIMAL(15,2)
    employee_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)    # auto_now_add = set once when record created
    updated_at = models.DateTimeField(auto_now=True)         # auto_now = updates every time record is saved
    is_active  = models.BooleanField(default=True)

    def __str__(self):
        # __str__ = what shows in Django admin panel for this record
        return f"{self.name} - {self.company}"

    class Meta:
        db_table = 'crm_customers'      # exact table name in SQL Server
        ordering = ['-created_at']      # - prefix = descending (newest first)


class Deal(models.Model):
    # Pipeline stages in order from first contact to close
    STAGE_CHOICES = [
        ('prospecting',   'Prospecting'),
        ('qualification', 'Qualification'),
        ('proposal',      'Proposal'),
        ('negotiation',   'Negotiation'),
        ('closed_won',    'Closed Won'),
        ('closed_lost',   'Closed Lost'),
    ]

    # ForeignKey = many deals can belong to one customer (many-to-one relationship)
    # on_delete=CASCADE = if customer deleted, all their deals are deleted too
    # related_name='deals' = allows customer.deals.all() to get all deals
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='deals'
    )

    title          = models.CharField(max_length=300)
    value          = models.DecimalField(max_digits=15, decimal_places=2)
    stage          = models.CharField(max_length=20, choices=STAGE_CHOICES, default='prospecting')
    probability    = models.IntegerField(default=0)     # 0-100, set manually by sales rep
    expected_close = models.DateField()
    actual_close   = models.DateField(null=True, blank=True)    # null=True = NULL allowed in DB
    notes          = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.customer.name}"

    class Meta:
        db_table = 'crm_deals'
        ordering = ['-created_at']


class Activity(models.Model):
    # Activity = any interaction with a customer (call, email, meeting etc.)
    TYPE_CHOICES = [
        ('call',      'Phone Call'),
        ('email',     'Email'),
        ('meeting',   'Meeting'),
        ('demo',      'Product Demo'),
        ('follow_up', 'Follow Up'),
    ]

    # Activity must belong to a customer (required)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='activities'
    )

    # Activity optionally belongs to a deal
    # on_delete=SET_NULL = if deal deleted, activity stays but deal_id becomes NULL
    deal = models.ForeignKey(
        Deal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )

    activity_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    subject       = models.CharField(max_length=300)    # short title of the activity
    description   = models.TextField(blank=True)         # detailed notes
    outcome       = models.TextField(blank=True)         # what happened as a result
    activity_date = models.DateTimeField()               # when this activity took place

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.activity_type} - {self.subject}"

    class Meta:
        db_table = 'crm_activities'
        ordering = ['-activity_date']