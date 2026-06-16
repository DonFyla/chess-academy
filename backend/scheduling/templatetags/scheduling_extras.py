from django import template
from datetime import datetime

register = template.Library()


@register.filter
def div(value, arg):
    try:
        return int(value) // int(arg)
    except (ValueError, ZeroDivisionError):
        return 0

DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


@register.filter
def day_name(value):
    try:
        return DAY_NAMES[int(value)]
    except (ValueError, IndexError, TypeError):
        return value


@register.filter
def parse_iso_date(value):
    if not value:
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return value
