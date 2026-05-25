# AI prediction engine using LangChain PromptTemplate structure
# LangChain = framework that formats data before sending to AI model
# PromptTemplate = reusable text template with {variables}

from langchain.prompts import PromptTemplate

# --- PROMPT TEMPLATES ---
# PromptTemplate: formats deal data into structured text for analysis
# input_variables: list of {placeholders} used inside the template string
DEAL_PROMPT = PromptTemplate(
    input_variables=["title", "value", "stage", "probability", "activities", "notes"],
    template="""
    Deal: {title} | Value: ${value} | Stage: {stage}
    Probability: {probability}% | Activities: {activities} | Notes: {notes}
    """
)

# Churn = customer stops doing business with us
CHURN_PROMPT = PromptTemplate(
    input_variables=["name", "company", "total_deals", "won_deals", "lost_deals", "activities", "win_rate"],
    template="""
    Customer: {name} ({company})
    Deals: {total_deals} total, {won_deals} won, {lost_deals} lost
    Interactions: {activities} | Win Rate: {win_rate}%
    """
)

# Pipeline = all open deals and their total value
INSIGHTS_PROMPT = PromptTemplate(
    input_variables=["days", "total", "won", "lost", "active", "pipeline", "revenue", "win_rate"],
    template="""
    Last {days} days: {total} deals, {won} won, {lost} lost, {active} active
    Pipeline: ${pipeline} | Revenue: ${revenue} | Win Rate: {win_rate}%
    """
)


def predict_deal_outcome(deal_id: int) -> dict:
    # Deal = one sales opportunity with a customer
    # select_related = fetches customer data in same SQL query (faster)
    from .models import Deal, Activity

    deal             = Deal.objects.select_related('customer').get(id=deal_id)
    activities_count = Activity.objects.filter(deal=deal).count()

    # DEAL_PROMPT.format() = fills {placeholders} with real deal data
    formatted_prompt = DEAL_PROMPT.format(
        title=deal.title,
        value=str(deal.value),
        stage=deal.get_stage_display(),     # get_stage_display() = returns 'Negotiation' instead of 'negotiation'
        probability=str(deal.probability),
        activities=str(activities_count),
        notes=deal.notes[:200] if deal.notes else "No notes"
    )
    print(f"[AI] Analyzing deal: {deal.title}")

    # --- SCORING SYSTEM ---
    # score = total points, higher score = higher chance of winning
    score = 0

    # Stage score: negotiation stage means deal is almost closing = high points
    stage_scores = {
        'prospecting':   10,   # just started
        'qualification': 25,   # customer confirmed interest
        'proposal':      42,   # quote was sent
        'negotiation':   65,   # finalizing terms
        'closed_won':   100,   # already won
        'closed_lost':    0,   # already lost
    }
    score += stage_scores.get(deal.stage, 10)

    # Probability: sales rep manually sets this 0-100%
    if deal.probability >= 70:
        score += 20
    elif deal.probability >= 50:
        score += 12
    elif deal.probability >= 30:
        score += 6
    else:
        score += 2

    # Activities: more interactions = more engaged customer = higher score
    if activities_count >= 5:
        score += 15
    elif activities_count >= 3:
        score += 10
    elif activities_count >= 1:
        score += 5

    # Deal value: high value deals get more attention from both sides
    deal_value = float(deal.value)
    if deal_value >= 1000000:
        score += 10
    elif deal_value >= 500000:
        score += 7
    elif deal_value >= 100000:
        score += 4
    else:
        score += 2

    # --- DETERMINE WIN OR LOSS ---
    # closed stages: return 100% confidence immediately
    if deal.stage == 'closed_won':
        prediction, confidence = 'WIN', 100
        main_reason = "Deal is already closed and won"
    elif deal.stage == 'closed_lost':
        prediction, confidence = 'LOSS', 100
        main_reason = "Deal is already closed and lost"
    elif score >= 70:
        prediction  = 'WIN'
        confidence  = min(score, 94)    # cap at 94% - never 100% for open deals
        main_reason = f"Strong indicators: stage={deal.get_stage_display()}, score={score}/100"
    elif score >= 45:
        prediction  = 'WIN'
        confidence  = score
        main_reason = f"Moderate indicators: score={score}/100, needs more engagement"
    else:
        prediction  = 'LOSS'
        confidence  = min(100 - score + 15, 94)
        main_reason = f"Weak indicators: score={score}/100, deal needs attention"

    # next_action: specific step the sales rep should take right now
    next_actions = {
        'prospecting':   'Schedule a discovery call to understand requirements',
        'qualification': 'Send a detailed proposal with clear pricing',
        'proposal':      'Follow up on proposal and request feedback',
        'negotiation':   'Address objections and push for contract signing',
        'closed_won':    'Begin customer onboarding process',
        'closed_lost':   'Request feedback to improve future pitches',
    }

    return {
        "prediction":  prediction,          # "WIN" or "LOSS"
        "confidence":  confidence,          # 0-100 percentage
        "next_action": next_actions.get(deal.stage, 'Follow up with the customer'),
        "reason":      main_reason,         # why this prediction was made
        "score":       score,               # raw score for transparency
    }


def predict_customer_churn(customer_id: int) -> dict:
    # churn_score: higher = customer more likely to leave us
    from .models import Customer, Deal, Activity

    customer         = Customer.objects.get(id=customer_id)
    all_deals        = Deal.objects.filter(customer=customer)
    total_deals      = all_deals.count()
    won_deals        = all_deals.filter(stage='closed_won').count()
    lost_deals       = all_deals.filter(stage='closed_lost').count()
    active_deals     = all_deals.exclude(stage__in=['closed_won','closed_lost']).count()
    total_activities = Activity.objects.filter(customer=customer).count()
    win_rate         = round((won_deals / total_deals * 100), 1) if total_deals > 0 else 0.0

    # CHURN_PROMPT.format() = structures customer data for analysis
    formatted_prompt = CHURN_PROMPT.format(
        name=customer.name,
        company=customer.company,
        total_deals=str(total_deals),
        won_deals=str(won_deals),
        lost_deals=str(lost_deals),
        activities=str(total_activities),
        win_rate=str(win_rate)
    )
    print(f"[AI] Analyzing churn risk for: {customer.name}")

    # --- CHURN SCORING ---
    churn_score = 0

    if total_deals == 0:
        churn_score += 40       # never converted = high risk
    if total_deals > 0 and lost_deals > won_deals:
        churn_score += 30       # losing more than winning = bad sign
    if total_deals > 0 and win_rate < 30:
        churn_score += 15       # very low win rate
    if total_activities == 0:
        churn_score += 30       # zero interactions = completely disengaged
    elif total_activities < 2:
        churn_score += 15       # barely any interaction
    elif total_activities < 4:
        churn_score += 5
    if active_deals == 0 and won_deals == 0:
        churn_score += 20       # no current or past business
    if not customer.is_active:
        churn_score += 50       # flagged as inactive = already churned

    # risk level: HIGH means call them today, LOW means they are happy
    if churn_score >= 60:
        risk = "HIGH"
    elif churn_score >= 30:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    # health_score: opposite of churn_score, shown as 0-100 on UI
    health_score = max(100 - churn_score, 5)

    # retention_actions: specific steps to prevent customer from leaving
    retention_map = {
        "HIGH": [
            "Schedule urgent executive check-in call this week",
            "Offer special renewal discount or loyalty incentive",
            "Assign dedicated account manager immediately",
        ],
        "MEDIUM": [
            "Send monthly value report highlighting ROI achieved",
            "Invite customer to product webinar or training session",
            "Schedule quarterly business review meeting",
        ],
        "LOW": [
            "Maintain regular monthly follow-up cadence",
            "Share product updates and new feature releases",
            "Request referrals — satisfied customers refer others",
        ],
    }

    return {
        "churn_risk":            risk,                      # HIGH / MEDIUM / LOW
        "churn_probability":     min(churn_score, 95),      # 0-95%
        "customer_health_score": health_score,              # 0-100
        "warning_signs": [
            f"Deals: {total_deals} total, {won_deals} won, {lost_deals} lost, {active_deals} active",
            f"Win rate: {win_rate}%",
            f"Total recorded interactions: {total_activities}",
        ],
        "retention_actions": retention_map[risk],
    }


def get_sales_insights(timeframe_days: int = 30) -> dict:
    # pipeline_value = total $ value of all open (not yet closed) deals
    # won_revenue = total $ actually earned from closed won deals
    from .models import Deal
    from django.utils import timezone
    from datetime import timedelta

    since = timezone.now() - timedelta(days=timeframe_days)
    deals = Deal.objects.filter(created_at__gte=since)

    total_deals  = deals.count()
    won_deals    = deals.filter(stage='closed_won').count()
    lost_deals   = deals.filter(stage='closed_lost').count()
    active_deals = deals.exclude(stage__in=['closed_won','closed_lost']).count()

    pipeline_value = sum(
        float(d.value) for d in deals.exclude(stage__in=['closed_won','closed_lost'])
    )
    won_revenue = sum(
        float(d.value) for d in deals.filter(stage='closed_won')
    )

    closed_total = won_deals + lost_deals
    win_rate     = round((won_deals / closed_total * 100), 1) if closed_total > 0 else 0.0

    # INSIGHTS_PROMPT.format() = structures all metrics for analysis
    formatted_prompt = INSIGHTS_PROMPT.format(
        days=str(timeframe_days),
        total=str(total_deals),
        won=str(won_deals),
        lost=str(lost_deals),
        active=str(active_deals),
        pipeline=f"{pipeline_value:,.0f}",
        revenue=f"{won_revenue:,.0f}",
        win_rate=str(win_rate)
    )
    print(f"[AI] Generating insights for last {timeframe_days} days")

    # performance_summary: one paragraph overview shown at top of dashboard
    performance_summary = (
        f"In the last {timeframe_days} days, your team created {total_deals} deals "
        f"and closed {won_deals} as won with total revenue of ${won_revenue:,.0f}. "
        f"Current win rate is {win_rate}% with an active pipeline worth ${pipeline_value:,.0f}."
    )

    # key_insights: 3 important numbers the manager needs to see
    key_insights = [
        f"Active pipeline: ${pipeline_value:,.0f} across {active_deals} open deals",
        f"Revenue won this period: ${won_revenue:,.0f} from {won_deals} closed deals",
        f"Win rate {win_rate}% — {'on track' if win_rate >= 50 else 'below 50% target, needs attention'}",
    ]

    # action_items: 3 specific things the team should do this week
    action_items = []

    if active_deals == 0:
        action_items.append("Pipeline is empty — start prospecting new leads immediately")
    elif active_deals >= 3:
        action_items.append(f"Follow up on all {active_deals} active deals this week")
    else:
        action_items.append(f"Push {active_deals} active deal(s) to next stage this week")

    if win_rate < 40 and closed_total > 0:
        action_items.append(f"Win rate {win_rate}% is low — review lost deals to find patterns")
    elif win_rate >= 60:
        action_items.append("Great win rate! Share winning strategies with the full team")
    else:
        action_items.append("Update deal stages and probabilities every week for accuracy")

    if lost_deals > won_deals:
        action_items.append(f"Lost {lost_deals} vs won {won_deals} — review competitor pricing strategy")
    else:
        action_items.append("Good win/loss ratio — focus on increasing average deal value")

    # forecast: estimated revenue next month (30% of pipeline is industry standard)
    forecast_revenue = pipeline_value * 0.30
    forecast = (
        f"Based on pipeline of ${pipeline_value:,.0f}, "
        f"projected next 30-day revenue: ${forecast_revenue:,.0f} (30% conversion rate applied)"
    )

    return {
        "performance_summary": performance_summary,
        "key_insights":        key_insights,
        "action_items":        action_items,
        "forecast":            forecast,
        "metrics": {
            "total_deals":    total_deals,
            "won_deals":      won_deals,
            "lost_deals":     lost_deals,
            "active_deals":   active_deals,
            "pipeline_value": pipeline_value,
            "won_revenue":    won_revenue,
            "win_rate":       win_rate,
        }
    }