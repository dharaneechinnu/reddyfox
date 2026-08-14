from django.core.management.base import BaseCommand, CommandError

from mcp_server.models import McpToken, generate_token


class Command(BaseCommand):
    help = (
        'Issue an MCP token for Claude or ChatGPT to connect with. The secret is printed once '
        'and only its hash is stored, so copy it straight into the client config. Grants read '
        'access only unless --images / --content are passed.'
    )

    def add_arguments(self, parser):
        parser.add_argument('name', help='Who uses it, e.g. "Claude desktop — Priya".')
        parser.add_argument('--images', action='store_true', help='Allow uploading and editing site photos.')
        parser.add_argument('--content', action='store_true', help='Allow creating and editing testimonials and FAQs.')
        parser.add_argument('--no-read', action='store_true', help='Withhold read access (rarely what you want).')

    def handle(self, *args, **options):
        name = options['name'].strip()
        if not name:
            raise CommandError('A name is required — it is what identifies this token in the audit log.')

        raw = generate_token()
        token = McpToken(
            name=name,
            can_read=not options['no_read'],
            can_write_images=options['images'],
            can_write_content=options['content'],
        )
        token.set_token(raw)
        token.save()

        self.stdout.write(self.style.SUCCESS(f'Created MCP token "{name}" [{", ".join(token.scopes) or "no scopes"}]'))
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('Copy this now — it is not stored and cannot be shown again:'))
        self.stdout.write('')
        self.stdout.write(f'  {raw}')
        self.stdout.write('')
        self.stdout.write('Connect a client to POST <ADMIN_BASE_URL>/mcp/ with header:')
        self.stdout.write('  Authorization: Bearer <the token above>')
        self.stdout.write('See docs/mcp-server.md for the Claude and ChatGPT setup steps.')
