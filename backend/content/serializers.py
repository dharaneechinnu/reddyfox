import re
from html import escape

from rest_framework import serializers

from .models import Faq, FaqCategory, Testimonial


def text_to_paragraphs(text):
    """Turn a plain-text field into safe HTML paragraphs.

    Blank line = new paragraph. Everything is HTML-escaped first, so staff can
    type ampersands, angle brackets and quotes freely without breaking the page
    or injecting markup.
    """
    if not text:
        return ''
    blocks = re.split(r'\n\s*\n', text.strip())
    return ''.join(
        '<p>' + escape(b.strip()).replace('\n', '<br />') + '</p>'
        for b in blocks if b.strip()
    )


class TestimonialSerializer(serializers.ModelSerializer):
    initials = serializers.CharField(source='resolved_initials', read_only=True)

    class Meta:
        model = Testimonial
        fields = ['id', 'quote', 'name', 'role', 'initials', 'display_order']


class FaqSerializer(serializers.ModelSerializer):
    answer_html = serializers.SerializerMethodField()
    category = serializers.StringRelatedField()

    class Meta:
        model = Faq
        fields = ['id', 'question', 'answer', 'answer_html', 'category', 'show_on_homepage', 'display_order']

    def get_answer_html(self, obj):
        return text_to_paragraphs(obj.answer)


class FaqCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqCategory
        fields = ['id', 'name', 'display_order']
