from django.test import TestCase
from django.urls import reverse
from scheduling.models import Coach


class WebPageTests(TestCase):
    def test_home_page(self):
        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "web/home.html")

    def test_courses_page(self):
        response = self.client.get(reverse("courses"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "web/courses.html")

    def test_tutors_page(self):
        response = self.client.get(reverse("tutors"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "web/tutors.html")

    def test_gallery_page(self):
        response = self.client.get(reverse("gallery"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "web/gallery.html")

    def test_course_detail_pages(self):
        for slug in ["beginner", "intermediate", "expert"]:
            with self.subTest(slug=slug):
                response = self.client.get(reverse("course_detail", args=[slug]))
                self.assertEqual(response.status_code, 200)
                self.assertTemplateUsed(response, "web/course_detail.html")

    def test_course_detail_404(self):
        response = self.client.get(reverse("course_detail", args=["nonexistent"]))
        self.assertEqual(response.status_code, 404)


class CoachPageTests(TestCase):
    def setUp(self):
        self.coach = Coach.objects.create(
            name="Test Coach",
            bio="A great chess coach.",
            specialization="Endgames",
            rank_title="FM",
            hourly_rate=10000,
            achievements=["National Champion", "FIDE Master"],
        )

    def test_tutors_page_lists_coach(self):
        response = self.client.get(reverse("tutors"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.coach.name)
        self.assertContains(response, self.coach.specialization)


class SpecialCoachesSplitViewTests(TestCase):
    def setUp(self):
        self.normal_coach = Coach.objects.create(
            name="Regular Coach",
            bio="Regular coach bio.",
            specialization="Beginner Lessons",
            is_special=False,
        )
        self.gold_coach = Coach.objects.create(
            name="Gold Elite Coach",
            bio="Elite coach bio.",
            specialization="Grandmaster Training",
            is_special=True,
            rank_title="Nigeria's #1",
            hourly_rate=25000,
            achievements=["FIDE Master", "National Champion 2025"],
            special_bio="International Master with 15+ years experience.",
            featured_order=1,
        )
        self.silver_coach = Coach.objects.create(
            name="Silver Elite Coach",
            bio="Elite coach bio.",
            specialization="Advanced Tactics",
            is_special=True,
            rank_title="Nigeria's #2",
            hourly_rate=20000,
            achievements=["National Master"],
            featured_order=2,
        )
        self.bronze_coach = Coach.objects.create(
            name="Bronze Elite Coach",
            bio="Elite coach bio.",
            specialization="Endgames",
            is_special=True,
            rank_title="Nigeria's #3",
            hourly_rate=18000,
            achievements=["State Champion"],
            featured_order=3,
        )
        self.star_coach = Coach.objects.create(
            name="Star Elite Coach",
            bio="Elite coach bio.",
            specialization="Openings",
            is_special=True,
            rank_title="FIDE Master",
            hourly_rate=15000,
            featured_order=4,
        )

    def test_tutors_page_defaults_to_elite_tab(self):
        response = self.client.get(reverse("tutors"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Elite / Special Coaches")
        self.assertContains(response, "Elite Coaching Program")

    def test_tutors_page_shows_rank_badges(self):
        response = self.client.get(reverse("tutors"))
        self.assertContains(response, "#1 Elite")
        self.assertContains(response, "#2 Elite")
        self.assertContains(response, "#3 Elite")
        self.assertContains(response, "Elite Coach")

    def test_tutors_page_shows_achievements_and_rates(self):
        response = self.client.get(reverse("tutors"))
        self.assertContains(response, "FIDE Master")
        self.assertContains(response, "National Champion 2025")
        self.assertContains(response, "₦25,000")
        self.assertContains(response, "₦20,000")
        self.assertContains(response, "₦18,000")
        self.assertContains(response, "₦15,000")
        self.assertContains(response, "International Master with 15+ years experience.")

    def test_special_coach_book_button_links_to_special_tab(self):
        response = self.client.get(reverse("tutors"))
        self.assertContains(response, f"{reverse('scheduling:book_coach', args=[self.gold_coach.id])}?tab=special")
