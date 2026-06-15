def navigation(request):
    path = request.path
    items = [
        {"label": "Home", "url": "/", "name": "home"},
        {"label": "About", "url": "/#about-us", "name": "about"},
        {"label": "Courses", "url": "/courses/", "name": "courses"},
        {"label": "Tutors", "url": "/tutors/", "name": "tutors"},
        {"label": "Gallery", "url": "/gallery/", "name": "gallery"},
        {"label": "Quiz", "url": "/quiz/", "name": "quiz"},
    ]

    # Mark active based on path or anchor
    for item in items:
        item["active"] = False
        if item["name"] == "home" and path == "/":
            item["active"] = True
        elif item["url"].rstrip("/") == path.rstrip("/"):
            item["active"] = True

    return {"nav_items": items}
