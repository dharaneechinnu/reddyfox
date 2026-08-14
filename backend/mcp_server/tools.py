"""The tools an assistant can call.

Two rules shape the whole set, and both come from CLAUDE.md's content rule
rather than from anything about MCP:

1. **Text arrives unpublished.** A testimonial or FAQ created here is written
   with `is_visible=False` unless the caller passes `publish: true`. This is a
   regulated money changer: a fabricated customer quote is a fake review and a
   confidently wrong sentence about an RBI limit is a compliance problem, so
   the default is that a person sees it in /admin/ before the public does.

2. **Photos arrive published.** A photo is the opposite case — it makes no
   factual claim, the slot is already showing a placeholder that the upload is
   meant to replace, and it is obvious at a glance whether it is right. Landing
   those hidden would mean every upload needed a second trip to the admin to do
   nothing but reveal it.

The asymmetry is deliberate. Both defaults are overridable per call.
"""
import base64
import binascii
import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db.models import Max

from content.models import Faq, FaqCategory, SiteImage, Testimonial
from content.validators import validate_image_upload

from .registry import ToolError, tool

# A data URI wrapper is what a browser (and most assistants) hand you when an
# image has been pasted rather than read off disk. Accept either form.
DATA_URI_RE = re.compile(r'^data:image/(?P<fmt>[a-zA-Z0-9.+-]+);base64,', re.I)

PUBLISH_HELP = (
    'Publish immediately instead of leaving it hidden for a person to review in '
    'the Django admin. Default false — leave it false unless the business has '
    'confirmed the exact wording.'
)


# --- helpers ----------------------------------------------------------------

def _max_image_bytes():
    return settings.MCP_MAX_IMAGE_MB * 1024 * 1024


def _decode_image(raw_value, slot):
    """Turn a base64 string (bare or data: URI) into a named Django file."""
    payload = raw_value.strip()
    match = DATA_URI_RE.match(payload)
    declared_format = None
    if match:
        declared_format = match.group('fmt').lower()
        payload = payload[match.end():]
    # Assistants and JSON encoders both like to wrap long base64 in newlines.
    payload = re.sub(r'\s+', '', payload)

    try:
        data = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ToolError(
            'image_base64 is not valid base64. Send the raw base64 of the image file, '
            'optionally as a data: URI.'
        ) from exc

    if not data:
        raise ToolError('image_base64 decoded to an empty file.')

    limit = _max_image_bytes()
    if len(data) > limit:
        raise ToolError(
            f'Image is {len(data) / 1024 / 1024:.1f} MB, over the '
            f'{settings.MCP_MAX_IMAGE_MB} MB limit. Resize it and try again.'
        )

    extension = {'jpeg': 'jpg', 'jpg': 'jpg', 'png': 'png', 'webp': 'webp'}.get(declared_format, 'jpg')
    safe_slot = slot.replace('/', '-')
    return ContentFile(data, name=f'{safe_slot}.{extension}')


def _slot_labels():
    return dict(SiteImage.Slot.choices)


def _require_slot(slot):
    labels = _slot_labels()
    if slot not in labels:
        raise ToolError(
            f'Unknown slot {slot!r}. Call list_image_slots to see the valid slot names.'
        )
    return labels[slot]


def _image_row(slot, label, obj, request):
    if obj is None:
        return {'slot': slot, 'label': label, 'has_image': False}
    url = obj.image.url if obj.image else None
    if url and request is not None:
        url = request.build_absolute_uri(url)
    return {
        'slot': slot,
        'label': label,
        'has_image': True,
        'is_visible': obj.is_visible,
        'alt_text': obj.resolved_alt_text,
        'alt_text_is_default': not obj.alt_text,
        'url': url,
        'updated_at': obj.updated_at.isoformat(),
    }


def _testimonial_row(obj):
    return {
        'id': obj.pk,
        'quote': obj.quote,
        'name': obj.name,
        'role': obj.role,
        'is_published': obj.is_visible,
        'display_order': obj.display_order,
    }


def _faq_row(obj):
    return {
        'id': obj.pk,
        'question': obj.question,
        'answer': obj.answer,
        'category': obj.category.name if obj.category else None,
        'show_on_homepage': obj.show_on_homepage,
        'is_published': obj.is_visible,
        'display_order': obj.display_order,
    }


def _next_display_order(model):
    highest = model.objects.aggregate(top=Max('display_order'))['top']
    return 0 if highest is None else highest + 1


def _resolve_category(name):
    """Match an existing FAQ category by name, case-insensitively.

    Deliberately does not create one. The category list is the shape of the FAQ
    page's sidebar — a new one is a change to how the page is organised, which
    is a decision for a person in /admin/, not a side effect of filing a
    question under a name that was slightly misremembered.
    """
    if not name:
        return None
    category = FaqCategory.objects.filter(name__iexact=name.strip()).first()
    if category is None:
        available = list(FaqCategory.objects.values_list('name', flat=True))
        listed = ', '.join(repr(item) for item in available) or '(none defined yet)'
        raise ToolError(
            f'No FAQ category named {name!r}. Existing categories: {listed}. '
            f'Add a new category in the Django admin first, or leave category empty.'
        )
    return category


# --- read tools -------------------------------------------------------------

@tool(
    name='get_content_overview',
    scope='read',
    description=(
        'A summary of the website content this server can edit: how many photo slots are '
        'filled, how many testimonials and FAQs exist, and what is currently unpublished and '
        'waiting for a person to review. Call this first — it is the cheapest way to see the '
        'state of the site before changing anything.'
    ),
    input_schema={'type': 'object', 'properties': {}, 'required': []},
)
def get_content_overview(args, context):
    total_slots = len(SiteImage.Slot.choices)
    images = list(SiteImage.objects.all())
    filled = {obj.slot for obj in images}
    return {
        'images': {
            'slots_total': total_slots,
            'slots_filled': len(filled),
            'slots_empty': total_slots - len(filled),
            'hidden': sum(1 for obj in images if not obj.is_visible),
        },
        'testimonials': {
            'total': Testimonial.objects.count(),
            'published': Testimonial.objects.filter(is_visible=True).count(),
            'awaiting_review': Testimonial.objects.filter(is_visible=False).count(),
        },
        'faqs': {
            'total': Faq.objects.count(),
            'published': Faq.objects.filter(is_visible=True).count(),
            'awaiting_review': Faq.objects.filter(is_visible=False).count(),
            'categories': list(FaqCategory.objects.values_list('name', flat=True)),
        },
        'note': (
            'Anything under "awaiting_review" is written but hidden from the public site until '
            'a person publishes it in the Django admin.'
        ),
    }


@tool(
    name='list_image_slots',
    scope='read',
    description=(
        'Every photo slot on the website, with whether a photo has been uploaded into it, its '
        'alt text and its URL. Slot names are fixed — use one from here as the "slot" argument '
        'to upload_site_image.'
    ),
    input_schema={
        'type': 'object',
        'properties': {
            'filter': {
                'type': 'string',
                'enum': ['all', 'filled', 'empty'],
                'default': 'all',
                'description': 'Narrow to slots that do or do not have a photo yet.',
            },
        },
        'required': [],
    },
)
def list_image_slots(args, context):
    existing = {obj.slot: obj for obj in SiteImage.objects.all()}
    wanted = args['filter']
    rows = []
    for slot, label in SiteImage.Slot.choices:
        obj = existing.get(slot)
        if wanted == 'filled' and obj is None:
            continue
        if wanted == 'empty' and obj is not None:
            continue
        rows.append(_image_row(slot, label, obj, context.get('request')))
    return {'count': len(rows), 'slots': rows}


@tool(
    name='list_testimonials',
    scope='read',
    description='Customer testimonials on the site, published and unpublished.',
    input_schema={
        'type': 'object',
        'properties': {
            'filter': {
                'type': 'string',
                'enum': ['all', 'published', 'awaiting_review'],
                'default': 'all',
                'description': 'Narrow to published testimonials or ones still hidden.',
            },
        },
        'required': [],
    },
)
def list_testimonials(args, context):
    queryset = Testimonial.objects.all()
    if args['filter'] == 'published':
        queryset = queryset.filter(is_visible=True)
    elif args['filter'] == 'awaiting_review':
        queryset = queryset.filter(is_visible=False)
    rows = [_testimonial_row(obj) for obj in queryset]
    return {'count': len(rows), 'testimonials': rows}


@tool(
    name='list_faqs',
    scope='read',
    description='Frequently asked questions on the site, published and unpublished, with their categories.',
    input_schema={
        'type': 'object',
        'properties': {
            'filter': {
                'type': 'string',
                'enum': ['all', 'published', 'awaiting_review'],
                'default': 'all',
                'description': 'Narrow to published FAQs or ones still hidden.',
            },
            'category': {
                'type': 'string',
                'maxLength': 60,
                'description': 'Optional. Only FAQs in this category.',
            },
        },
        'required': [],
    },
)
def list_faqs(args, context):
    queryset = Faq.objects.select_related('category')
    if args['filter'] == 'published':
        queryset = queryset.filter(is_visible=True)
    elif args['filter'] == 'awaiting_review':
        queryset = queryset.filter(is_visible=False)
    if args['category']:
        queryset = queryset.filter(category=_resolve_category(args['category']))
    rows = [_faq_row(obj) for obj in queryset]
    return {
        'count': len(rows),
        'faqs': rows,
        'categories': list(FaqCategory.objects.values_list('name', flat=True)),
    }


# --- image tools ------------------------------------------------------------

@tool(
    name='upload_site_image',
    scope='images',
    description=(
        'Upload a photo into one of the website\'s photo slots, replacing whatever is there. '
        'Send the image as base64 (a data: URI is fine). JPEG, PNG or WebP. Anything larger '
        'than 1600px on its longest side is resized automatically. Use list_image_slots to find '
        'the slot name. The photo goes live immediately unless you pass publish: false.'
    ),
    input_schema={
        'type': 'object',
        'properties': {
            'slot': {
                'type': 'string',
                'maxLength': 40,
                'description': 'Which slot to fill, e.g. "about_counter". From list_image_slots.',
            },
            'image_base64': {
                'type': 'string',
                'minLength': 1,
                'description': 'The image file, base64-encoded. A "data:image/png;base64,..." URI also works.',
            },
            'alt_text': {
                'type': 'string',
                'maxLength': 200,
                'description': (
                    'Describes the photo for screen readers and search engines. Describe what is '
                    'actually in the picture. Leave empty to use the slot label.'
                ),
            },
            'publish': {
                'type': 'boolean',
                'default': True,
                'description': 'Show it on the site straight away. Default true.',
            },
        },
        'required': ['slot', 'image_base64'],
    },
)
def upload_site_image(args, context):
    slot = args['slot']
    label = _require_slot(slot)
    upload = _decode_image(args['image_base64'], slot)

    try:
        validate_image_upload(upload)
    except ValidationError as exc:
        raise ToolError('; '.join(exc.messages)) from exc

    obj = SiteImage.objects.filter(slot=slot).first()
    replaced = obj is not None and bool(obj.image)
    previous_name = obj.image.name if replaced else None
    if obj is None:
        obj = SiteImage(slot=slot)

    obj.image = upload
    if args['alt_text'] is not None:
        obj.alt_text = args['alt_text'].strip()
    obj.is_visible = args['publish']
    obj.save()

    # Django leaves the old file on disk when an ImageField is reassigned. On
    # the deploy target that disk is a fixed-size mounted volume, so replacing
    # the same slot repeatedly would fill it with orphans nothing can reach.
    if previous_name and previous_name != obj.image.name:
        try:
            obj.image.storage.delete(previous_name)
        except OSError:
            pass  # A missing or unwritable old file must not fail the upload.

    url = obj.image.url
    request = context.get('request')
    if request is not None:
        url = request.build_absolute_uri(url)

    return {
        'summary': f'{"Replaced" if replaced else "Uploaded"} photo in slot "{slot}"',
        'slot': slot,
        'label': label,
        'replaced_existing': replaced,
        'is_visible': obj.is_visible,
        'alt_text': obj.resolved_alt_text,
        'url': url,
        'note': (
            'Live on the site now.' if obj.is_visible
            else 'Uploaded but hidden — publish it in the Django admin under Content → Site images.'
        ),
    }


@tool(
    name='update_site_image',
    scope='images',
    description=(
        'Change the alt text of an already-uploaded photo, or show/hide it, without '
        're-uploading the file.'
    ),
    input_schema={
        'type': 'object',
        'properties': {
            'slot': {'type': 'string', 'maxLength': 40, 'description': 'Which slot to update.'},
            'alt_text': {
                'type': 'string',
                'maxLength': 200,
                'description': 'New alt text. Omit to leave it unchanged.',
            },
            'is_visible': {
                'type': 'boolean',
                'description': 'Show or hide the photo. Omit to leave it unchanged.',
            },
        },
        'required': ['slot'],
    },
)
def update_site_image(args, context):
    slot = args['slot']
    _require_slot(slot)
    obj = SiteImage.objects.filter(slot=slot).first()
    if obj is None:
        raise ToolError(
            f'No photo has been uploaded into slot {slot!r} yet — use upload_site_image first.'
        )

    changed = []
    if args['alt_text'] is not None:
        obj.alt_text = args['alt_text'].strip()
        changed.append('alt_text')
    if args['is_visible'] is not None:
        obj.is_visible = args['is_visible']
        changed.append('is_visible')

    if not changed:
        raise ToolError('Nothing to update — pass alt_text, is_visible, or both.')

    # update_fields keeps SiteImage.save() from re-opening the file for a
    # change that cannot have touched it.
    obj.save(update_fields=[*changed, 'updated_at'])

    return {
        'summary': f'Updated {", ".join(changed)} on slot "{slot}"',
        'slot': slot,
        'alt_text': obj.resolved_alt_text,
        'is_visible': obj.is_visible,
    }


# --- content tools ----------------------------------------------------------

@tool(
    name='create_testimonial',
    scope='content',
    description=(
        'Add a customer testimonial. It is saved hidden and a person publishes it in the Django '
        'admin, unless you pass publish: true.\n\n'
        'These are real reviews from real named customers. Only ever enter a quote the business '
        'has actually given you — writing a plausible one is fabricating a customer review.'
    ),
    input_schema={
        'type': 'object',
        'properties': {
            'quote': {
                'type': 'string',
                'minLength': 10,
                'maxLength': 2000,
                'description': "The customer's own words. No surrounding quote marks — the site adds them.",
            },
            'name': {
                'type': 'string',
                'minLength': 2,
                'maxLength': 80,
                'description': 'The customer\'s name, e.g. "Deborah Beck".',
            },
            'role': {
                'type': 'string',
                'maxLength': 120,
                'description': 'Optional context, e.g. "Google review" or "Frequent traveller, Chennai".',
            },
            'publish': {'type': 'boolean', 'default': False, 'description': PUBLISH_HELP},
        },
        'required': ['quote', 'name'],
    },
)
def create_testimonial(args, context):
    obj = Testimonial.objects.create(
        quote=args['quote'].strip(),
        name=args['name'].strip(),
        role=(args['role'] or '').strip(),
        is_visible=args['publish'],
        display_order=_next_display_order(Testimonial),
    )
    return {
        'summary': f'Created testimonial #{obj.pk} from "{obj.name}"',
        **_testimonial_row(obj),
        'note': (
            'Live on the site now.' if obj.is_visible
            else 'Saved but hidden — a person publishes it in the Django admin under '
                 'Content → Testimonials.'
        ),
    }


@tool(
    name='update_testimonial',
    scope='content',
    description=(
        'Edit an existing testimonial, or publish/hide it. Pass only the fields you want to '
        'change. Use list_testimonials to find the id.'
    ),
    input_schema={
        'type': 'object',
        'properties': {
            'id': {'type': 'integer', 'minimum': 1, 'description': 'The testimonial id.'},
            'quote': {'type': 'string', 'minLength': 10, 'maxLength': 2000, 'description': 'Replacement quote.'},
            'name': {'type': 'string', 'minLength': 2, 'maxLength': 80, 'description': 'Replacement name.'},
            'role': {'type': 'string', 'maxLength': 120, 'description': 'Replacement role/context.'},
            'is_published': {
                'type': 'boolean',
                'description': 'Show it on the site, or hide it again.',
            },
        },
        'required': ['id'],
    },
)
def update_testimonial(args, context):
    obj = Testimonial.objects.filter(pk=args['id']).first()
    if obj is None:
        raise ToolError(f'No testimonial with id {args["id"]}. Use list_testimonials to see them.')

    changed = []
    for field in ('quote', 'name', 'role'):
        if args[field] is not None:
            setattr(obj, field, args[field].strip())
            changed.append(field)
    if args['is_published'] is not None:
        obj.is_visible = args['is_published']
        changed.append('is_visible')

    if not changed:
        raise ToolError('Nothing to update — pass at least one of quote, name, role, is_published.')

    obj.save(update_fields=[*changed, 'updated_at'])
    return {
        'summary': f'Updated {", ".join(changed)} on testimonial #{obj.pk}',
        **_testimonial_row(obj),
    }


@tool(
    name='create_faq',
    scope='content',
    description=(
        'Add a frequently asked question. It is saved hidden and a person publishes it in the '
        'Django admin, unless you pass publish: true.\n\n'
        'FAQs on this site answer questions about RBI rules, cash limits and documents. Getting '
        'one subtly wrong is a compliance problem, not a typo — only write answers the business '
        'has confirmed.'
    ),
    input_schema={
        'type': 'object',
        'properties': {
            'question': {
                'type': 'string',
                'minLength': 5,
                'maxLength': 255,
                'description': 'The question, as a customer would ask it.',
            },
            'answer': {
                'type': 'string',
                'minLength': 10,
                'maxLength': 8000,
                'description': 'Plain text. Leave a blank line between paragraphs — no HTML.',
            },
            'category': {
                'type': 'string',
                'maxLength': 60,
                'description': (
                    'Optional. Must be an existing category name — list_faqs returns the valid '
                    'ones. New categories are added in the Django admin, not here.'
                ),
            },
            'show_on_homepage': {
                'type': 'boolean',
                'default': True,
                'description': 'Also show this in the homepage FAQ accordion.',
            },
            'publish': {'type': 'boolean', 'default': False, 'description': PUBLISH_HELP},
        },
        'required': ['question', 'answer'],
    },
)
def create_faq(args, context):
    obj = Faq.objects.create(
        question=args['question'].strip(),
        answer=args['answer'].strip(),
        category=_resolve_category(args['category']),
        show_on_homepage=args['show_on_homepage'],
        is_visible=args['publish'],
        display_order=_next_display_order(Faq),
    )
    return {
        'summary': f'Created FAQ #{obj.pk}: {obj.question[:60]}',
        **_faq_row(obj),
        'note': (
            'Live on the site now.' if obj.is_visible
            else 'Saved but hidden — a person publishes it in the Django admin under Content → FAQs.'
        ),
    }


@tool(
    name='update_faq',
    scope='content',
    description=(
        'Edit an existing FAQ, or publish/hide it. Pass only the fields you want to change. '
        'Use list_faqs to find the id.'
    ),
    input_schema={
        'type': 'object',
        'properties': {
            'id': {'type': 'integer', 'minimum': 1, 'description': 'The FAQ id.'},
            'question': {'type': 'string', 'minLength': 5, 'maxLength': 255, 'description': 'Replacement question.'},
            'answer': {'type': 'string', 'minLength': 10, 'maxLength': 8000, 'description': 'Replacement answer.'},
            'category': {'type': 'string', 'maxLength': 60, 'description': 'Move it to this existing category.'},
            'show_on_homepage': {'type': 'boolean', 'description': 'Show or hide it in the homepage accordion.'},
            'is_published': {'type': 'boolean', 'description': 'Show it on the site, or hide it again.'},
        },
        'required': ['id'],
    },
)
def update_faq(args, context):
    obj = Faq.objects.filter(pk=args['id']).first()
    if obj is None:
        raise ToolError(f'No FAQ with id {args["id"]}. Use list_faqs to see them.')

    changed = []
    for field in ('question', 'answer'):
        if args[field] is not None:
            setattr(obj, field, args[field].strip())
            changed.append(field)
    if args['category'] is not None:
        obj.category = _resolve_category(args['category'])
        changed.append('category')
    if args['show_on_homepage'] is not None:
        obj.show_on_homepage = args['show_on_homepage']
        changed.append('show_on_homepage')
    if args['is_published'] is not None:
        obj.is_visible = args['is_published']
        changed.append('is_visible')

    if not changed:
        raise ToolError(
            'Nothing to update — pass at least one of question, answer, category, '
            'show_on_homepage, is_published.'
        )

    obj.save(update_fields=[*changed, 'updated_at'])
    return {
        'summary': f'Updated {", ".join(changed)} on FAQ #{obj.pk}',
        **_faq_row(obj),
    }
