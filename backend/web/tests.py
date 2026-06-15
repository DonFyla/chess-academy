from django.test import TestCase
from django.urls import reverse


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
