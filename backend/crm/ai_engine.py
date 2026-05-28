# AI Engine - uses LangChain PromptTemplate to structure analysis
# Rule-based scoring for predictions (no heavy ML models needed)
from langchain.prompts import PromptTemplate

# LangChain PromptTemplate: structures data before analysis
DEAL_PROMPT = PromptTemplate(
    input_variables=["title", "value", "stage", "probability", "activities", "notes"],
    template="""
    Deal: {title} | Value: ${value} | Stage: {stage}
    Probability: {probability}% | Activities: {activities} | Notes: {notes}
    """
)

CHURN_PROMPT = PromptTemplate(
    input_variables=["name", "company", "total_deals", "won_deals", "lost_deals", "activities", "win_rate"],
    template="""
    Customer: {name} ({company})
    Deals: {total_deals} total, {won_deals} won, {lost_deals} lost
    Interactions: {activities} | Win Rate: {win_rate}%
    """
)

INSIGHTS_PROMPT = PromptTemplate(
    input_variables=["days", "total", "won", "lost", "active", "pipeline", "revenue", "win_rate"],
    template="""
    Last {days} days: {total} deals, {won} won, {lost} lost, {active} active
    Pipeline: ${pipeline} | Revenue: ${revenue} | Win Rate: {win_rate}%
    """
)


def predict_deal_outcome(deal_id: int) -> dict:
    # fetch deal with customer data in single query
    from .models import Deal, Activity
    deal             = Deal.objects.select_related('customer').get(id=deal_id)
    activities_count = Activity.objects.filter(deal=deal).count()

    # format data using LangChain PromptTemplate
    DEAL_PROMPT.format(
        title=deal.title,
        value=str(deal.value),
        stage=deal.get_stage_display(),
        probability=str(deal.probability),
        activities=str(activities_count),
        notes=deal.notes[:200] if deal.notes else "No notes"
    )

    # scoring: each factor adds points, total determines WIN/LOSS
    score = 0

    # stage score: negotiation = almost closing = high points
    stage_scores = {
        'prospecting':   10,
        'qualification': 25,
        'proposal':      42,
        'negotiation':   65,
        'closed_won':   100,
        'closed_lost':    0,
    }
    score += stage_scores.get(deal.stage, 10)

    # probability set by sales rep: 0-100%
    if deal.probability >= 70:
        score += 20
    elif deal.probability >= 50:
        score += 12
    elif deal.probability >= 30:
        score += 6
    else:
        score += 2

    # activities: more interactions = more engaged customer
    if activities_count >= 5:
        score += 15
    elif activities_count >= 3:
        score += 10
    elif activities_count >= 1:
        score += 5

    # deal value: high value deals get more attention
    deal_value = float(deal.value)
    if deal_value >= 1000000:
        score += 10
    elif deal_value >= 500000:
        score += 7
    elif deal_value >= 100000:
        score += 4
    else:
        score += 2

    # determine WIN or LOSS based on total score
    if deal.stage == 'closed_won':
        prediction, confidence = 'WIN', 100
        main_reason = "Deal is already closed and won"
    elif deal.stage == 'closed_lost':
        prediction, confidence = 'LOSS', 100
        main_reason = "Deal is already closed and lost"
    elif score >= 70:
        prediction  = 'WIN'
        confidence  = min(score, 94)
        main_reason = f"Strong score ({score}/100): stage={deal.get_stage_display()}, probability={deal.probability}%"
    elif score >= 45:
        prediction  = 'WIN'
        confidence  = score
        main_reason = f"Moderate score ({score}/100): needs more engagement"
    else:
        prediction  = 'LOSS'
        confidence  = min(100 - score + 15, 94)
        main_reason = f"Low score ({score}/100): deal needs immediate attention"

    # next action based on current stage
    next_actions = {
        'prospecting':   'Schedule a discovery call to understand requirements',
        'qualification': 'Send a detailed proposal with clear pricing',
        'proposal':      'Follow up on the proposal and request feedback',
        'negotiation':   'Address all objections and push for contract signing',
        'closed_won':    'Begin customer onboarding process',
        'closed_lost':   'Request feedback to improve future pitches',
    }

    return {
        "prediction":  prediction,
        "confidence":  confidence,
        "next_action": next_actions.get(deal.stage, 'Follow up with the customer'),
        "reason":      main_reason,
        "score":       score,
    }


def predict_customer_churn(customer_id: int) -> dict:
    from .models import Customer, Deal, Activity

    customer         = Customer.objects.get(id=customer_id)
    all_deals        = Deal.objects.filter(customer=customer)
    total_deals      = all_deals.count()
    won_deals        = all_deals.filter(stage='closed_won').count()
    lost_deals       = all_deals.filter(stage='closed_lost').count()
    active_deals     = all_deals.exclude(stage__in=['closed_won','closed_lost']).count()
    total_activities = Activity.objects.filter(customer=customer).count()
    win_rate         = round((won_deals / total_deals * 100), 1) if total_deals > 0 else 0.0

    # format using LangChain PromptTemplate
    CHURN_PROMPT.format(
        name=customer.name,
        company=customer.company,
        total_deals=str(total_deals),
        won_deals=str(won_deals),
        lost_deals=str(lost_deals),
        activities=str(total_activities),
        win_rate=str(win_rate)
    )

    # churn scoring: higher score = more risk of customer leaving
    churn_score = 0

    if total_deals == 0:
        churn_score += 40       # never converted
    if total_deals > 0 and lost_deals > won_deals:
        churn_score += 30       # more losses than wins
    if total_deals > 0 and win_rate < 30:
        churn_score += 15       # very low win rate
    if total_activities == 0:
        churn_score += 30       # zero interactions
    elif total_activities < 2:
        churn_score += 15
    elif total_activities < 4:
        churn_score += 5
    if active_deals == 0 and won_deals == 0:
        churn_score += 20       # no current or past business
    if not customer.is_active:
        churn_score += 50       # marked inactive

    # risk level based on churn score
    if churn_score >= 60:
        risk = "HIGH"
    elif churn_score >= 30:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    health_score = max(100 - churn_score, 5)

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
            "Request referrals from satisfied customer",
        ],
    }

    return {
        "churn_risk":            risk,
        "churn_probability":     min(churn_score, 95),
        "customer_health_score": health_score,
        "warning_signs": [
            f"Deals: {total_deals} total, {won_deals} won, {lost_deals} lost, {active_deals} active",
            f"Win rate: {win_rate}%",
            f"Total interactions: {total_activities}",
        ],
        "retention_actions": retention_map[risk],
    }


def get_sales_insights(timeframe_days: int = 30) -> dict:
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

    # format using LangChain PromptTemplate
    INSIGHTS_PROMPT.format(
        days=str(timeframe_days),
        total=str(total_deals),
        won=str(won_deals),
        lost=str(lost_deals),
        active=str(active_deals),
        pipeline=f"{pipeline_value:,.0f}",
        revenue=f"{won_revenue:,.0f}",
        win_rate=str(win_rate)
    )

    # generate real insights from actual data
    performance_summary = (
        f"In the last {timeframe_days} days, your team created {total_deals} deals "
        f"and closed {won_deals} as won with total revenue of ${won_revenue:,.0f}. "
        f"Current win rate is {win_rate}% with an active pipeline worth ${pipeline_value:,.0f}."
    )

    key_insights = [
        f"Active pipeline: ${pipeline_value:,.0f} across {active_deals} open deals",
        f"Revenue won this period: ${won_revenue:,.0f} from {won_deals} closed deals",
        f"Win rate {win_rate}% — {'on track' if win_rate >= 50 else 'below 50% target'}",
    ]

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
        action_items.append("Excellent win rate — share winning strategies with the team")
    else:
        action_items.append("Update deal stages and probabilities every week for accuracy")

    if lost_deals > won_deals:
        action_items.append(f"More deals lost ({lost_deals}) than won ({won_deals}) — review competitor pricing")
    else:
        action_items.append("Good win/loss ratio — focus on increasing average deal value")

    forecast_revenue = pipeline_value * 0.30
    forecast = (
        f"Based on pipeline of ${pipeline_value:,.0f}, "
        f"projected next 30-day revenue: ${forecast_revenue:,.0f} (30% conversion rate)"
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