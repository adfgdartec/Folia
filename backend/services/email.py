
import logging
from typing import Optional
from datetime import date
from sendgrid.helpers.mail import (Mail, To, From, DynamicTemplateData, TemplateId, Subject)
import sendgrid


from core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


# General email sending function
async def send_email(to_email: str, to_name: str, template_id: str, template_data: dict, subject_override: Optional[str] = None,) -> bool:
    if not settings.sengrid_api_key:
        logger.warning("Log for Sendgrid failure, email not sent to", to_email)

    if not template_id: 
        logger.warning("Template ID not set for email", to_email)

    try:
        message = Mail(from_email=From(settings.sendgrid.from_email, settings.sendgrid.from_name), to_emails=To(to_email, to_name),)
        message.template_id = TemplateId(template_id)
        message.dynamic_template_data = DynamicTemplateData({
            **template_data,
            "user_name": to_name,
            "user_email": to_email,
            "app_name": "Folia",
            "app_url": settings.frontend_url,
            "current_year": str(date.today().year),
        })
    
        if subject_override:
            message.subject = Subject(subject_override)
    
        sendgrid = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        response = sendgrid.send(message)
    
        if response.status_code in (200, 202):
            logger.info("Email sent to %s via template %s", to_email, template_id)
            return True
        else:
            logger.error("SendGrid error %s for %s", response.status_code, to_email)
            return False

    except ImportError:
        logger.error("sendgrid package not installed. Run: pip install sendgrid")
        return False
    except Exception as e:
        logger.error("SendGrid send failed for %s: %s", to_email, e)
        return False

async def send_welcome_email(to_email: str, user_name: str, life_stage: str) -> bool:
    STAGE_TIPS = {
        "foundations": [
            "Open a high-yield savings account and automate $25/mo",
            "Learn how a paycheck and taxes actually work",
            "Build your first budget using the 50/30/20 rule",
        ],
        "launch": [
            "Contribute enough to your 401k to get the full employer match",
            "Build a 3-month emergency fund before investing",
            "Open a Roth IRA — time is your biggest advantage",
        ],
        "build": [
            "Max out your 401k and Roth IRA contributions",
            "Aggressively pay off any debt above 6% interest",
            "Diversify investments across asset classes",
        ],
        "accelerate": [
            "Max all tax-advantaged accounts including HSA",
            "Review and rebalance your asset allocation annually",
            "Consider term life insurance if you have dependents",
        ],
        "preserve": [
            "Take advantage of catch-up contributions (age 50+)",
            "Plan your Social Security claiming strategy",
            "Complete estate planning documents",
        ],
        "retire": [
            "Follow the 4% withdrawal rule as a starting guideline",
            "Optimize RMD timing to minimize taxes",
            "Draw taxable accounts first, Roth last",
        ],
    }
    
    return await send_email(
        to_email=to_email,
        to_name=user_name,
        template_id=settings.sendgrid_welcome_template_id,
        template_data={
            "life_stage": life_stage,
            "life_stage_label": life_stage.replace("_", " ").title(),
            "dashboard_url": f"{settings.frontend_url}/dashboard",
            "life_stage_tips": STAGE_TIPS.get(life_stage, STAGE_TIPS["launch"]),
        },
    )

async def send_goal_achieved_email(to_email: str, user_name: str, goal_name: str, goal_amount: str, next_suggested_goal: Optional[str] = None) -> bool:
    return await send_email(
        to_email=to_email,
        to_name=user_name,
        template_id=settings.sendgrid_goal_achieved_template_id,
        template_data={
            "goal_name": goal_name,
            "goal_amount": goal_amount,
            "goal_amount_formatted": f"${goal_amount:,.0f}",
            "next_suggested_goal": next_suggested_goal or "Start your next financial goal",
            "goals_url": f"{settings.frontend_url}/finances"
        },
    )

async def send_debt_paid_email(to_email: str, user_name: str, debt_name: str, original_balance: float, interest_paid: Optional[float] = None,) -> bool:
    return await send_email(
        to_email=to_email,
        to_name=user_name,
        template_id=settings.sendgrid_goal_achieved_template_id,
        template_data={
            "debt_name": debt_name, 
            "original_balance": original_balance,
            "original_balance_formatted": f"${original_balance:,.0f}",
            "interest_paid_formatted": f"${interest_paid:,.0f}" if interest_paid else "N/A",
            "finances_url": f"{settings.frontend_url}/finances",
        }
    )

async def send_weekly_summary_email(to_email: str, user_name: str, net_worth: float, net_worth_change: float, top_expense_category: str, top_expense_amount: float, health_score: int, active_goals_count: int, insights: list[str],) -> bool:
    return await send_email(
        to_email=to_email,
        to_name=user_name,
        template_id=settings.sendgrid_weekly_summary_template_id,
        template_data={
            "net_worth_formatted": f"${net_worth:,.0f}",
            "net_worth_change_formatted": f"${abs(net_worth_change):,.0f}",
            "net_worth_change_positive": net_worth_change >= 0,
            "net_worth_change_direction": "up" if net_worth_change > 0 else "down",
            "top_expense_category": top_expense_category.replace("_", " ").title(),
            "top_expense_amount_formatted": f"${top_expense_amount:,.0f}",
            "health_score": health_score,
            "active_goals_count": active_goals_count,
            "insights": insights[:3],
            "dashboard_url": f"{settings.frontend_url}/dashboard",
            "week_of": date.todau.strftime("%B %d, %Y"),
        },
    )

async def send_quarterly_tax_reminder( to_email: str, user_name: str, quarter: str, due_date: str, estimated_payment: float, income_type: str, ) -> bool:
    return await send_email(
        to_email=to_email,
        to_name=user_name,
        template_id=settings.sendgrid_quarterly_tax_template_id,
        template_data={
            "quarter":                    quarter,
            "due_date":                   due_date,
            "estimated_payment":          estimated_payment,
            "estimated_payment_formatted": f"${estimated_payment:,.0f}",
            "income_type":                income_type,
            "tax_url":                    f"{settings.frontend_url}/tax",
            "irs_direct_pay_url":         "https://www.irs.gov/payments/direct-pay",
            "days_until_due":             "See due date above",
        },
        subject_override=f"{quarter} estimated tax due {due_date} — Folia reminder",
    )

async def send_alert_email(to_email: str, user_name: str, alert_title: str, alert_message: str, alert_priority: str, action_url: Optional[str] = None, action_label: Optional[str] = None,) -> bool:
    if alert_priority not in ("high", "urgent"):
        return True  

    return await send_email(
        to_email=to_email,
        to_name=user_name,
        template_id=settings.sendgrid_alert_template_id,
        template_data={
            "alert_title":    alert_title,
            "alert_message":  alert_message,
            "alert_priority": alert_priority,
            "is_urgent":      alert_priority == "urgent",
            "action_url":     action_url or f"{settings.frontend_url}/dashboard",
            "action_label":   action_label or "View in Folia",
            "dashboard_url":  f"{settings.frontend_url}/dashboard",
        },
        subject_override=f"{ "Alert: " if alert_priority == 'urgent' else "Caution: "} {alert_title} — Folia",
    )
    
